const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { writeAudit } = require('../utils/audit');

const router = express.Router();

const VALID_RECURRENCES = ['daily', 'weekdays', 'weekends', 'custom_days', 'one_off'];

// GET /api/tasks — list tasks for the household
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const includeInactive = req.query.include_inactive === 'true' && req.session.role === 'admin';

  const tasks = db.prepare(`
    SELECT t.*,
           u1.name AS default_assignee_name,
           u2.name AS created_by_name,
           u3.name AS instructions_author_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.default_assignee_id
    LEFT JOIN users u2 ON u2.id = t.created_by
    LEFT JOIN users u3 ON u3.id = t.instructions_author_id
    WHERE t.household_id = ?
      ${includeInactive ? '' : 'AND t.is_active = 1'}
    ORDER BY t.title
  `).all(req.session.householdId);

  res.json(tasks.map(t => ({
    ...t,
    custom_days: t.custom_days ? JSON.parse(t.custom_days) : null,
    is_active: Boolean(t.is_active),
  })));
});

// GET /api/tasks/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const task = db.prepare(`
    SELECT t.*,
           u1.name AS default_assignee_name,
           u2.name AS created_by_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.default_assignee_id
    LEFT JOIN users u2 ON u2.id = t.created_by
    WHERE t.id = ? AND t.household_id = ?
  `).get(req.params.id, req.session.householdId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  res.json({
    ...task,
    custom_days: task.custom_days ? JSON.parse(task.custom_days) : null,
    is_active: Boolean(task.is_active),
  });
});

// POST /api/tasks — admin creates a new task
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const {
    title, description, instructions,
    default_assignee_id, recurrence = 'daily', custom_days,
  } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });
  if (!VALID_RECURRENCES.includes(recurrence)) {
    return res.status(400).json({ error: `recurrence must be one of: ${VALID_RECURRENCES.join(', ')}` });
  }

  const db = getDb();

  // Validate assignee belongs to household
  if (default_assignee_id) {
    const assignee = db.prepare(
      'SELECT id FROM users WHERE id = ? AND household_id = ?'
    ).get(default_assignee_id, req.session.householdId);
    if (!assignee) return res.status(400).json({ error: 'Invalid default_assignee_id' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO tasks
      (id, household_id, title, description, instructions, instructions_author_id,
       instructions_updated_at, default_assignee_id, recurrence, custom_days, is_active, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id, req.session.householdId, title.trim(), description || null,
    instructions || null,
    instructions ? req.session.userId : null,
    instructions ? now : null,
    default_assignee_id || null,
    recurrence,
    custom_days ? JSON.stringify(custom_days) : null,
    req.session.userId, now
  );

  writeAudit({
    householdId: req.session.householdId,
    actorId: req.session.userId,
    action: 'task.created',
    entityType: 'task',
    entityId: id,
    detail: { title, recurrence },
  });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(201).json({
    ...task,
    custom_days: task.custom_days ? JSON.parse(task.custom_days) : null,
    is_active: Boolean(task.is_active),
  });
});

// PATCH /api/tasks/:id — admin updates a task
router.patch('/:id', requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const task = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND household_id = ?'
  ).get(req.params.id, req.session.householdId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const {
    title, description, instructions,
    default_assignee_id, recurrence, custom_days, is_active,
  } = req.body;

  const updates = {};
  const now = new Date().toISOString();

  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description;
  if (instructions !== undefined) {
    updates.instructions = instructions;
    updates.instructions_author_id = req.session.userId;
    updates.instructions_updated_at = now;
  }
  if (default_assignee_id !== undefined) {
    if (default_assignee_id) {
      const assignee = db.prepare(
        'SELECT id FROM users WHERE id = ? AND household_id = ?'
      ).get(default_assignee_id, req.session.householdId);
      if (!assignee) return res.status(400).json({ error: 'Invalid default_assignee_id' });
    }
    updates.default_assignee_id = default_assignee_id || null;
  }
  if (recurrence !== undefined) {
    if (!VALID_RECURRENCES.includes(recurrence)) {
      return res.status(400).json({ error: `recurrence must be one of: ${VALID_RECURRENCES.join(', ')}` });
    }
    updates.recurrence = recurrence;
  }
  if (custom_days !== undefined) {
    updates.custom_days = custom_days ? JSON.stringify(custom_days) : null;
  }
  if (is_active !== undefined) {
    updates.is_active = is_active ? 1 : 0;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE tasks SET ${setClauses} WHERE id = ?`)
    .run(...Object.values(updates), req.params.id);

  writeAudit({
    householdId: req.session.householdId,
    actorId: req.session.userId,
    action: 'task.updated',
    entityType: 'task',
    entityId: req.params.id,
    detail: { fields: Object.keys(updates) },
  });

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({
    ...updated,
    custom_days: updated.custom_days ? JSON.parse(updated.custom_days) : null,
    is_active: Boolean(updated.is_active),
  });
});

// DELETE /api/tasks/:id — admin soft-deletes (deactivates) a task
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const task = db.prepare(
    'SELECT id FROM tasks WHERE id = ? AND household_id = ?'
  ).get(req.params.id, req.session.householdId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare('UPDATE tasks SET is_active = 0 WHERE id = ?').run(req.params.id);

  writeAudit({
    householdId: req.session.householdId,
    actorId: req.session.userId,
    action: 'task.deactivated',
    entityType: 'task',
    entityId: req.params.id,
  });

  res.json({ ok: true });
});

// PATCH /api/tasks/:id/instructions — member or admin can edit instructions
// (member can only edit instructions on tasks assigned to them, unless locked)
router.patch('/:id/instructions', requireAuth, (req, res) => {
  const { instructions } = req.body;
  if (instructions === undefined) {
    return res.status(400).json({ error: 'instructions field required' });
  }

  const db = getDb();
  const task = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND household_id = ?'
  ).get(req.params.id, req.session.householdId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Members can only edit instructions if they are the default assignee
  if (req.session.role !== 'admin') {
    if (task.default_assignee_id !== req.session.userId) {
      return res.status(403).json({ error: 'You can only edit instructions for tasks assigned to you' });
    }
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE tasks
    SET instructions = ?, instructions_author_id = ?, instructions_updated_at = ?
    WHERE id = ?
  `).run(instructions, req.session.userId, now, req.params.id);

  writeAudit({
    householdId: req.session.householdId,
    actorId: req.session.userId,
    action: 'task.instructions_updated',
    entityType: 'task',
    entityId: req.params.id,
  });

  res.json({ ok: true });
});

module.exports = router;

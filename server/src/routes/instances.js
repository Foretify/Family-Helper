const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { writeAudit } = require('../utils/audit');
const { materializeDay } = require('../utils/materialize');

const router = express.Router();

function today() {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/instances?date=YYYY-MM-DD[&user_id=xxx]
// Members see their own instances; admins can specify user_id or see all
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const date = req.query.date || today();
  const householdId = req.session.householdId;

  // Materialize today's instances on first request of the day
  if (date === today()) {
    materializeDay(householdId, date, req.session.userId);
  }

  let userId;
  if (req.session.role === 'admin') {
    userId = req.query.user_id || null; // null = all members
  } else {
    userId = req.session.userId; // members can only see their own
  }

  const query = `
    SELECT ti.*,
           t.title AS task_title,
           t.description AS task_description,
           t.recurrence,
           u1.name AS assigned_to_name,
           u1.avatar_color AS assigned_to_color,
           u2.name AS completed_by_name,
           u3.name AS verified_by_name,
           u4.name AS overridden_by_name
    FROM task_instances ti
    JOIN tasks t ON t.id = ti.task_id
    JOIN users u1 ON u1.id = ti.assigned_to
    LEFT JOIN users u2 ON u2.id = ti.completed_by
    LEFT JOIN users u3 ON u3.id = ti.verified_by
    LEFT JOIN users u4 ON u4.id = ti.overridden_by
    WHERE ti.household_id = ?
      AND ti.assigned_date = ?
      ${userId ? 'AND ti.assigned_to = ?' : ''}
    ORDER BY u1.name, t.title
  `;

  const args = userId ? [householdId, date, userId] : [householdId, date];
  const instances = db.prepare(query).all(...args);

  res.json(instances);
});

// POST /api/instances — admin creates an ad-hoc instance for any date/user
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { task_id, assigned_to, assigned_date, override_note } = req.body;

  if (!task_id || !assigned_to || !assigned_date) {
    return res.status(400).json({ error: 'task_id, assigned_to, and assigned_date are required' });
  }

  const db = getDb();

  const task = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND household_id = ?'
  ).get(task_id, req.session.householdId);
  if (!task) return res.status(400).json({ error: 'Invalid task_id' });

  const user = db.prepare(
    'SELECT id FROM users WHERE id = ? AND household_id = ?'
  ).get(assigned_to, req.session.householdId);
  if (!user) return res.status(400).json({ error: 'Invalid assigned_to' });

  // Check if instance already exists
  const existing = db.prepare(`
    SELECT id FROM task_instances
    WHERE task_id = ? AND assigned_to = ? AND assigned_date = ?
  `).get(task_id, assigned_to, assigned_date);

  if (existing) {
    return res.status(409).json({ error: 'Instance already exists for this task/user/date combination' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO task_instances
      (id, task_id, household_id, assigned_to, assigned_date, status,
       instructions_snapshot, override_note, overridden_by, overridden_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
  `).run(id, task_id, req.session.householdId, assigned_to, assigned_date,
    task.instructions || null, override_note || null, req.session.userId, now);

  writeAudit({
    householdId: req.session.householdId,
    actorId: req.session.userId,
    action: 'instance.created_adhoc',
    entityType: 'task_instance',
    entityId: id,
    detail: { task_id, assigned_to, assigned_date, override_note },
  });

  const instance = db.prepare('SELECT * FROM task_instances WHERE id = ?').get(id);
  res.status(201).json(instance);
});

// PATCH /api/instances/:id — update status, verify, override, reassign, or edit instructions
router.patch('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const instance = db.prepare(`
    SELECT ti.*, t.instructions AS task_instructions
    FROM task_instances ti
    JOIN tasks t ON t.id = ti.task_id
    WHERE ti.id = ? AND ti.household_id = ?
  `).get(req.params.id, req.session.householdId);

  if (!instance) return res.status(404).json({ error: 'Instance not found' });

  const isAdmin = req.session.role === 'admin';
  const isSelf = instance.assigned_to === req.session.userId;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { action, override_note, reassign_to, instructions_snapshot } = req.body;
  const now = new Date().toISOString();

  if (action === 'complete') {
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Only the assigned user can complete a task' });
    }
    if (instance.status === 'done') {
      return res.status(400).json({ error: 'Task is already marked done' });
    }
    db.prepare(`
      UPDATE task_instances
      SET status = 'done', completed_at = ?, completed_by = ?
      WHERE id = ?
    `).run(now, req.session.userId, instance.id);

    writeAudit({
      householdId: req.session.householdId,
      actorId: req.session.userId,
      action: 'instance.completed',
      entityType: 'task_instance',
      entityId: instance.id,
    });

  } else if (action === 'uncomplete') {
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare(`
      UPDATE task_instances
      SET status = 'pending', completed_at = NULL, completed_by = NULL,
          verified_by = NULL, verified_at = NULL
      WHERE id = ?
    `).run(instance.id);

    writeAudit({
      householdId: req.session.householdId,
      actorId: req.session.userId,
      action: 'instance.uncompleted',
      entityType: 'task_instance',
      entityId: instance.id,
    });

  } else if (action === 'verify') {
    if (!isAdmin) return res.status(403).json({ error: 'Only admins can verify task completion' });
    if (instance.status !== 'done') {
      return res.status(400).json({ error: 'Can only verify completed tasks' });
    }
    db.prepare(`
      UPDATE task_instances SET verified_by = ?, verified_at = ? WHERE id = ?
    `).run(req.session.userId, now, instance.id);

    writeAudit({
      householdId: req.session.householdId,
      actorId: req.session.userId,
      action: 'instance.verified',
      entityType: 'task_instance',
      entityId: instance.id,
    });

  } else if (action === 'skip') {
    if (!isAdmin) return res.status(403).json({ error: 'Only admins can skip tasks' });
    db.prepare(`
      UPDATE task_instances
      SET status = 'skipped', override_note = ?, overridden_by = ?, overridden_at = ?
      WHERE id = ?
    `).run(override_note || null, req.session.userId, now, instance.id);

    writeAudit({
      householdId: req.session.householdId,
      actorId: req.session.userId,
      action: 'instance.skipped',
      entityType: 'task_instance',
      entityId: instance.id,
      detail: { override_note },
    });

  } else if (action === 'reassign') {
    if (!isAdmin) return res.status(403).json({ error: 'Only admins can reassign tasks' });
    if (!reassign_to) return res.status(400).json({ error: 'reassign_to is required' });

    const newUser = db.prepare(
      'SELECT id FROM users WHERE id = ? AND household_id = ?'
    ).get(reassign_to, req.session.householdId);
    if (!newUser) return res.status(400).json({ error: 'Invalid reassign_to user' });

    // Mark current instance as reassigned
    db.prepare(`
      UPDATE task_instances
      SET status = 'reassigned', override_note = ?, overridden_by = ?, overridden_at = ?
      WHERE id = ?
    `).run(override_note || null, req.session.userId, now, instance.id);

    // Create new instance for the new assignee (if it doesn't already exist)
    const existingNew = db.prepare(`
      SELECT id FROM task_instances
      WHERE task_id = ? AND assigned_to = ? AND assigned_date = ?
    `).get(instance.task_id, reassign_to, instance.assigned_date);

    let newInstanceId = null;
    if (!existingNew) {
      newInstanceId = uuidv4();
      db.prepare(`
        INSERT INTO task_instances
          (id, task_id, household_id, assigned_to, assigned_date, status,
           instructions_snapshot, override_note, overridden_by, overridden_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
      `).run(
        newInstanceId, instance.task_id, req.session.householdId,
        reassign_to, instance.assigned_date,
        instance.instructions_snapshot,
        `Reassigned from another user: ${override_note || ''}`.trim(),
        req.session.userId, now
      );
    }

    writeAudit({
      householdId: req.session.householdId,
      actorId: req.session.userId,
      action: 'instance.reassigned',
      entityType: 'task_instance',
      entityId: instance.id,
      detail: { reassign_to, new_instance_id: newInstanceId, override_note },
    });

  } else if (action === 'update_instructions') {
    // Member can update instructions on their own instance; admin can always
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (instructions_snapshot === undefined) {
      return res.status(400).json({ error: 'instructions_snapshot required' });
    }
    db.prepare(
      'UPDATE task_instances SET instructions_snapshot = ? WHERE id = ?'
    ).run(instructions_snapshot, instance.id);

    writeAudit({
      householdId: req.session.householdId,
      actorId: req.session.userId,
      action: 'instance.instructions_updated',
      entityType: 'task_instance',
      entityId: instance.id,
    });

  } else {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  const updated = db.prepare('SELECT * FROM task_instances WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/instances/:id — admin only, hard delete (for ad-hoc instances)
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const instance = db.prepare(
    'SELECT id FROM task_instances WHERE id = ? AND household_id = ?'
  ).get(req.params.id, req.session.householdId);

  if (!instance) return res.status(404).json({ error: 'Instance not found' });

  db.prepare('DELETE FROM task_instances WHERE id = ?').run(req.params.id);

  writeAudit({
    householdId: req.session.householdId,
    actorId: req.session.userId,
    action: 'instance.deleted',
    entityType: 'task_instance',
    entityId: req.params.id,
  });

  res.json({ ok: true });
});

module.exports = router;

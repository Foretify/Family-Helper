const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { writeAudit } = require('../utils/audit');

const router = express.Router();

// GET /api/users — list all members of current household
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT id, name, email, role, avatar_color, created_at
    FROM users
    WHERE household_id = ?
    ORDER BY name
  `).all(req.session.householdId);
  res.json(users);
});

// GET /api/users/:id — get a specific user (admin or self)
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare(`
    SELECT id, name, email, role, avatar_color, created_at
    FROM users
    WHERE id = ? AND household_id = ?
  `).get(req.params.id, req.session.householdId);

  if (!user) return res.status(404).json({ error: 'User not found' });

  // Members can only view their own profile
  if (req.session.role !== 'admin' && req.session.userId !== req.params.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(user);
});

// POST /api/users — admin creates a new household member
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, password, role = 'member', avatar_color = '#6366f1' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin or member' });
  }

  const db = getDb();
  const existing = db.prepare(
    'SELECT id FROM users WHERE household_id = ? AND email = ?'
  ).get(req.session.householdId, email.trim().toLowerCase());

  if (existing) {
    return res.status(409).json({ error: 'Email already in use within this household' });
  }

  const hash = await bcrypt.hash(password, 12);
  const id = uuidv4();

  db.prepare(`
    INSERT INTO users (id, household_id, name, email, password_hash, role, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.session.householdId, name.trim(), email.trim().toLowerCase(), hash, role, avatar_color);

  writeAudit({
    householdId: req.session.householdId,
    actorId: req.session.userId,
    action: 'user.created',
    entityType: 'user',
    entityId: id,
    detail: { name, email, role },
  });

  res.status(201).json({ id, name: name.trim(), email: email.trim().toLowerCase(), role, avatar_color });
});

// PATCH /api/users/:id — update user (admin can update anyone; member can update own name/password/avatar)
router.patch('/:id', requireAuth, async (req, res) => {
  const db = getDb();
  const user = db.prepare(
    'SELECT * FROM users WHERE id = ? AND household_id = ?'
  ).get(req.params.id, req.session.householdId);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const isAdmin = req.session.role === 'admin';
  const isSelf = req.session.userId === req.params.id;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { name, email, password, role, avatar_color } = req.body;
  const updates = {};

  if (name !== undefined) updates.name = name.trim();
  if (email !== undefined && isAdmin) updates.email = email.trim().toLowerCase();
  if (avatar_color !== undefined) updates.avatar_color = avatar_color;
  if (role !== undefined && isAdmin) {
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'role must be admin or member' });
    }
    updates.role = role;
  }
  if (password !== undefined) {
    updates.password_hash = await bcrypt.hash(password, 12);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`)
    .run(...Object.values(updates), req.params.id);

  writeAudit({
    householdId: req.session.householdId,
    actorId: req.session.userId,
    action: 'user.updated',
    entityType: 'user',
    entityId: req.params.id,
    detail: { fields: Object.keys(updates) },
  });

  const updated = db.prepare(
    'SELECT id, name, email, role, avatar_color, created_at FROM users WHERE id = ?'
  ).get(req.params.id);
  res.json(updated);
});

// DELETE /api/users/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  if (req.params.id === req.session.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const db = getDb();
  const user = db.prepare(
    'SELECT id FROM users WHERE id = ? AND household_id = ?'
  ).get(req.params.id, req.session.householdId);

  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

  writeAudit({
    householdId: req.session.householdId,
    actorId: req.session.userId,
    action: 'user.deleted',
    entityType: 'user',
    entityId: req.params.id,
  });

  res.json({ ok: true });
});

module.exports = router;

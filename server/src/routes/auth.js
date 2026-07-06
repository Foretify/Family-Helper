const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../db');
const { writeAudit } = require('../utils/audit');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  const user = db.prepare(`
    SELECT u.*, h.name AS household_name
    FROM users u
    JOIN households h ON h.id = u.household_id
    WHERE u.email = ?
  `).get(email.trim().toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  req.session.householdId = user.household_id;
  req.session.role = user.role;
  req.session.name = user.name;

  writeAudit({
    householdId: user.household_id,
    actorId: user.id,
    action: 'user.login',
    entityType: 'user',
    entityId: user.id,
  });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar_color: user.avatar_color,
    household_id: user.household_id,
    household_name: user.household_name,
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const { userId, householdId } = req.session;
  req.session.destroy(() => {
    if (userId) {
      writeAudit({
        householdId,
        actorId: userId,
        action: 'user.logout',
        entityType: 'user',
        entityId: userId,
      });
    }
    res.json({ ok: true });
  });
});

// GET /api/auth/me — returns the currently authenticated user
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.avatar_color, u.household_id, u.created_at,
           h.name AS household_name
    FROM users u
    JOIN households h ON h.id = u.household_id
    WHERE u.id = ?
  `).get(req.session.userId);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Session invalid' });
  }

  res.json(user);
});

module.exports = router;

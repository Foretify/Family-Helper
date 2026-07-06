const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/history?user_id=xxx&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&status=xxx
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const isAdmin = req.session.role === 'admin';

  let userId;
  if (isAdmin) {
    userId = req.query.user_id || null;
  } else {
    userId = req.session.userId;
  }

  const { date_from, date_to, status } = req.query;
  const conditions = ['ti.household_id = ?'];
  const args = [req.session.householdId];

  if (userId) {
    conditions.push('ti.assigned_to = ?');
    args.push(userId);
  }
  if (date_from) {
    conditions.push('ti.assigned_date >= ?');
    args.push(date_from);
  }
  if (date_to) {
    conditions.push('ti.assigned_date <= ?');
    args.push(date_to);
  }
  if (status) {
    conditions.push('ti.status = ?');
    args.push(status);
  }

  const where = conditions.join(' AND ');

  const rows = db.prepare(`
    SELECT ti.*,
           t.title AS task_title,
           t.recurrence,
           u1.name  AS assigned_to_name,
           u1.avatar_color AS assigned_to_color,
           u2.name  AS completed_by_name,
           u3.name  AS verified_by_name
    FROM task_instances ti
    JOIN tasks t  ON t.id  = ti.task_id
    JOIN users u1 ON u1.id = ti.assigned_to
    LEFT JOIN users u2 ON u2.id = ti.completed_by
    LEFT JOIN users u3 ON u3.id = ti.verified_by
    WHERE ${where}
    ORDER BY ti.assigned_date DESC, u1.name, t.title
    LIMIT 500
  `).all(...args);

  res.json(rows);
});

// GET /api/history/audit — admin only, recent audit log
router.get('/audit', requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  const rows = db.prepare(`
    SELECT al.*, u.name AS actor_name
    FROM audit_log al
    LEFT JOIN users u ON u.id = al.actor_id
    WHERE al.household_id = ?
    ORDER BY al.created_at DESC
    LIMIT ?
  `).all(req.session.householdId, limit);

  res.json(rows.map(r => ({
    ...r,
    detail_json: r.detail_json ? JSON.parse(r.detail_json) : null,
  })));
});

module.exports = router;

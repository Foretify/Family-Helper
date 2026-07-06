const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

/**
 * Write an entry to the audit_log table.
 * @param {object} opts
 * @param {string} opts.householdId
 * @param {string|null} opts.actorId
 * @param {string} opts.action       - e.g. 'task.created', 'instance.completed'
 * @param {string} opts.entityType   - e.g. 'task', 'task_instance', 'user'
 * @param {string|null} opts.entityId
 * @param {object|null} opts.detail  - additional context (will be JSON-stringified)
 */
function writeAudit({ householdId, actorId = null, action, entityType, entityId = null, detail = null }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_log (id, household_id, actor_id, action, entity_type, entity_id, detail_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(uuidv4(), householdId, actorId, action, entityType, entityId, detail ? JSON.stringify(detail) : null);
}

module.exports = { writeAudit };

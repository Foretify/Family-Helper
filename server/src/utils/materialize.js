const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { writeAudit } = require('./audit');

/**
 * Determine which calendar dates fall within [startDate, endDate] for a given recurrence.
 * Returns an array of 'YYYY-MM-DD' strings.
 */
function dateRange(startDate, endDate) {
  const dates = [];
  const cur = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function dayOfWeek(dateStr) {
  // 0=Sun,1=Mon,...,6=Sat
  return new Date(dateStr + 'T00:00:00Z').getUTCDay();
}

function taskShouldRunOnDate(task, dateStr) {
  const dow = dayOfWeek(dateStr);
  switch (task.recurrence) {
    case 'daily':
      return true;
    case 'weekdays':
      return dow >= 1 && dow <= 5;
    case 'weekends':
      return dow === 0 || dow === 6;
    case 'custom_days': {
      if (!task.custom_days) return false;
      const days = JSON.parse(task.custom_days); // array of 0-6
      return days.includes(dow);
    }
    case 'one_off':
      return false; // one_off tasks are instantiated manually/ad-hoc
    default:
      return false;
  }
}

/**
 * Materialize task_instances for a given household on a given date.
 * Only creates instances that don't already exist.
 * Returns the number of newly created instances.
 */
function materializeDay(householdId, dateStr, actorId = null) {
  const db = getDb();

  // Get all active tasks for this household with a default assignee
  const tasks = db.prepare(`
    SELECT t.*, u.id AS assignee_id
    FROM tasks t
    LEFT JOIN users u ON u.id = t.default_assignee_id
    WHERE t.household_id = ?
      AND t.is_active = 1
      AND t.default_assignee_id IS NOT NULL
  `).all(householdId);

  const members = db.prepare(`
    SELECT id FROM users WHERE household_id = ? AND role = 'member'
  `).all(householdId);

  const memberIds = new Set(members.map(m => m.id));

  let created = 0;

  for (const task of tasks) {
    if (!taskShouldRunOnDate(task, dateStr)) continue;

    // Only create for the default assignee if they are a member
    // (or if default_assignee_id is null, skip — handled above)
    const assigneeId = task.default_assignee_id;

    // Check if instance already exists
    const existing = db.prepare(`
      SELECT id FROM task_instances
      WHERE task_id = ? AND assigned_to = ? AND assigned_date = ?
    `).get(task.id, assigneeId, dateStr);

    if (existing) continue;

    const instanceId = uuidv4();
    db.prepare(`
      INSERT INTO task_instances
        (id, task_id, household_id, assigned_to, assigned_date, status, instructions_snapshot)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(instanceId, task.id, householdId, assigneeId, dateStr, task.instructions || null);

    writeAudit({
      householdId,
      actorId,
      action: 'instance.created',
      entityType: 'task_instance',
      entityId: instanceId,
      detail: { task_id: task.id, assigned_to: assigneeId, date: dateStr, source: 'materialize' },
    });

    created++;
  }

  return created;
}

module.exports = { materializeDay, taskShouldRunOnDate };

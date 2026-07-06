/**
 * Seed script — creates a demo household, an admin user, a couple of members,
 * and a handful of tasks so you can try the app right away.
 *
 * Run:  node src/seed.js
 *
 * Credentials after seeding:
 *   admin@family.local / admin123
 *   alice@family.local / alice123
 *   bob@family.local   / bob123
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');

const db = getDb();

console.log('Seeding database…');

// Household
const householdId = uuidv4();
db.prepare("INSERT OR IGNORE INTO households (id, name) VALUES (?, ?)").run(householdId, 'The Smith Family');

// Users
async function seed() {
  const adminId = uuidv4();
  const aliceId = uuidv4();
  const bobId   = uuidv4();

  const adminHash = await bcrypt.hash('admin123', 12);
  const aliceHash = await bcrypt.hash('alice123', 12);
  const bobHash   = await bcrypt.hash('bob123',   12);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, household_id, name, email, password_hash, role, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(adminId, householdId, 'Admin Parent', 'admin@family.local', adminHash, 'admin', '#7c3aed');
  insertUser.run(aliceId, householdId, 'Alice',        'alice@family.local', aliceHash, 'member', '#0ea5e9');
  insertUser.run(bobId,   householdId, 'Bob',          'bob@family.local',   bobHash,   'member', '#f59e0b');

  // Tasks
  const now = new Date().toISOString();
  const insertTask = db.prepare(`
    INSERT OR IGNORE INTO tasks
      (id, household_id, title, description, instructions, recurrence, default_assignee_id, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTask.run(uuidv4(), householdId, 'Make Bed',          'Make your bed each morning',
    '1. Pull up the sheets\n2. Fluff pillows\n3. Straighten the duvet',
    'daily', aliceId, adminId, now);

  insertTask.run(uuidv4(), householdId, 'Empty Dishwasher',  'Put clean dishes away',
    null, 'daily', bobId, adminId, now);

  insertTask.run(uuidv4(), householdId, 'Take Out Trash',    'Wheelie bin to the kerb',
    null, 'weekdays', aliceId, adminId, now);

  insertTask.run(uuidv4(), householdId, 'Homework',          '30 minutes minimum',
    'Open your planner and work through each subject in order.',
    'weekdays', bobId, adminId, now);

  insertTask.run(uuidv4(), householdId, 'Tidy Bedroom',      'General tidy-up',
    null, 'weekends', aliceId, adminId, now);

  console.log('Seeding complete!');
  console.log('  Household:', householdId);
  console.log('  admin@family.local / admin123');
  console.log('  alice@family.local / alice123');
  console.log('  bob@family.local   / bob123');
}

seed().catch(console.error);

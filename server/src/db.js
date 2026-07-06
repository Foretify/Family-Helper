/**
 * Database setup using Node.js built-in sqlite module.
 * The database file is created at DB_PATH (default: ./family-helper.db).
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'family-helper.db');

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    // Enable WAL mode for better concurrency
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS households (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      household_id  TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK(role IN ('admin','member')) DEFAULT 'member',
      avatar_color  TEXT NOT NULL DEFAULT '#6366f1',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(household_id, email)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id                      TEXT PRIMARY KEY,
      household_id            TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      title                   TEXT NOT NULL,
      description             TEXT,
      instructions            TEXT,
      instructions_author_id  TEXT REFERENCES users(id),
      instructions_updated_at TEXT,
      default_assignee_id     TEXT REFERENCES users(id),
      recurrence              TEXT NOT NULL CHECK(recurrence IN ('daily','weekdays','weekends','custom_days','one_off')) DEFAULT 'daily',
      custom_days             TEXT,
      is_active               INTEGER NOT NULL DEFAULT 1,
      created_by              TEXT NOT NULL REFERENCES users(id),
      created_at              TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_instances (
      id                    TEXT PRIMARY KEY,
      task_id               TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      household_id          TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      assigned_to           TEXT NOT NULL REFERENCES users(id),
      assigned_date         TEXT NOT NULL,
      status                TEXT NOT NULL CHECK(status IN ('pending','done','skipped','reassigned')) DEFAULT 'pending',
      completed_at          TEXT,
      completed_by          TEXT REFERENCES users(id),
      verified_by           TEXT REFERENCES users(id),
      verified_at           TEXT,
      override_note         TEXT,
      overridden_by         TEXT REFERENCES users(id),
      overridden_at         TEXT,
      instructions_snapshot TEXT,
      UNIQUE(task_id, assigned_to, assigned_date)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id          TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      actor_id    TEXT REFERENCES users(id),
      action      TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id   TEXT,
      detail_json TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { getDb };

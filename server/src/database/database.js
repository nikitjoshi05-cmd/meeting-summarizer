import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DB_PATH = path.join(DATA_DIR, "meetings.sqlite3");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meetings (
      id            TEXT PRIMARY KEY,
      filename      TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'uploaded',
      error         TEXT,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      transcript    TEXT,
      summary       TEXT,
      key_points    TEXT,
      decisions     TEXT,
      action_items  TEXT,
      open_questions TEXT
    );
  `);
}

// status lifecycle: uploaded -> transcribing -> summarizing -> completed
//                                                            -> failed

export function createMeeting({ id, filename }) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO meetings (id, filename, status, created_at, updated_at)
     VALUES (?, ?, 'uploaded', ?, ?)`
  ).run(id, filename, now, now);
  return getMeeting(id);
}

export function updateMeetingStatus(id, status, extra = {}) {
  const fields = ["status = ?", "updated_at = ?"];
  const values = [status, new Date().toISOString()];

  for (const [key, value] of Object.entries(extra)) {
    fields.push(`${key} = ?`);
    values.push(
      typeof value === "object" && value !== null ? JSON.stringify(value) : value
    );
  }

  values.push(id);
  db.prepare(`UPDATE meetings SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getMeeting(id);
}

function parseJsonFields(row) {
  if (!row) return row;
  return {
    ...row,
    keyPoints: row.key_points ? JSON.parse(row.key_points) : [],
    decisions: row.decisions ? JSON.parse(row.decisions) : [],
    actionItems: row.action_items ? JSON.parse(row.action_items) : [],
    openQuestions: row.open_questions ? JSON.parse(row.open_questions) : [],
  };
}

export function getMeeting(id) {
  const row = db.prepare(`SELECT * FROM meetings WHERE id = ?`).get(id);
  return parseJsonFields(row);
}

export function listMeetings() {
  const rows = db
    .prepare(`SELECT * FROM meetings ORDER BY created_at DESC`)
    .all();
  return rows.map(parseJsonFields);
}

export default db;

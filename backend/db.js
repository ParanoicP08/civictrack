import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";

// Using Node's built-in SQLite (node:sqlite, stable since Node ~22.5+) instead of
// better-sqlite3. better-sqlite3 is a native addon that needs a compiled binary —
// on Windows with a brand-new Node version, no prebuilt binary exists yet and
// compiling from source requires a full Visual Studio C++ toolchain. node:sqlite
// ships with Node itself: zero native deps, zero install headaches.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, "civictrack.db"));

db.exec("PRAGMA journal_mode = WAL;");

// Single table is enough for this scope. Don't over-normalize a 4-week project.
db.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL CHECK(category IN ('pothole','footpath','drainage','streetlight','signage','other')),
    description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK(severity IN ('low','medium','high','critical')),
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    photo_filename TEXT,
    reported_by TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','resolved','rejected')),
    confirmations INTEGER NOT NULL DEFAULT 1,
    flagged INTEGER NOT NULL DEFAULT 0,
    flag_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_confirmed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

try {
  db.exec("ALTER TABLE issues ADD COLUMN severity TEXT NOT NULL DEFAULT 'medium'");
} catch (error) {
  if (!String(error.message).includes("duplicate column name")) throw error;
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category);
  CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
  CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at);
`);

export default db;

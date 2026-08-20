-- Workspace document store: one row holds the whole { logs, workflows } JSON.
CREATE TABLE IF NOT EXISTS workspace (
  id         TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

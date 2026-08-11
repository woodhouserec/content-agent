PRAGMA foreign_keys = off;

CREATE TABLE IF NOT EXISTS sources_new (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('rss', 'reddit', 'discovery_page')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  config_json TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO sources_new (id, type, name, url, config_json, enabled, created_at, updated_at)
SELECT id, type, name, url, config_json, enabled, created_at, updated_at
FROM sources;

DROP TABLE sources;

ALTER TABLE sources_new RENAME TO sources;

CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources(enabled);

PRAGMA foreign_keys = on;

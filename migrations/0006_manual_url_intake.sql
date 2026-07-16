CREATE TABLE IF NOT EXISTS pending_manual_urls (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  final_url TEXT,
  canonical_url TEXT,
  title TEXT,
  author TEXT,
  published_at TEXT,
  description TEXT,
  extracted_text TEXT,
  language TEXT,
  site_name TEXT,
  metadata_json TEXT,
  extraction_status TEXT NOT NULL,
  extraction_method TEXT NOT NULL,
  extraction_warnings_json TEXT,
  submitted_by TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  fetched_at TEXT,
  content_length INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_manual_urls_status ON pending_manual_urls(extraction_status);
CREATE INDEX IF NOT EXISTS idx_pending_manual_urls_canonical_url ON pending_manual_urls(canonical_url);

INSERT INTO sources (id, type, name, url, config_json, enabled, created_at, updated_at)
VALUES (
  'src_manual_urls',
  'rss',
  'Manual URL Submissions',
  'manual://urls',
  '{
    "author_name": "Manual submission",
    "source_tier": "discovery",
    "content_kind": "news",
    "language": "en",
    "topic_tags": [],
    "trust_score": 55,
    "editorial_priority": 2,
    "max_content_age_days": 14,
    "allow_full_text": false,
    "license_notes": "Manual URL metadata and excerpts only. Do not bypass paywalls or authorization.",
    "max_items_per_run": 0
  }',
  0,
  '2026-07-17T00:00:00.000Z',
  '2026-07-17T00:00:00.000Z'
)
ON CONFLICT(id) DO UPDATE SET
  config_json = excluded.config_json,
  enabled = 0,
  updated_at = excluded.updated_at;

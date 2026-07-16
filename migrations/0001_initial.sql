CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('rss', 'reddit')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  config_json TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collected_items (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  external_id TEXT,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  raw_content TEXT,
  normalized_content TEXT,
  author TEXT,
  published_at TEXT,
  collected_at TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  relevance_score REAL,
  status TEXT NOT NULL DEFAULT 'collected',
  metadata_json TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  processing_run_id TEXT,
  title TEXT NOT NULL,
  angle TEXT,
  summary TEXT,
  source_item_ids_json TEXT NOT NULL,
  relevance_score REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'selected',
  sent_to_telegram_at TEXT,
  selected_by_user_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (processing_run_id) REFERENCES processing_runs(id)
);

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  parent_draft_id TEXT,
  telegram_chat_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  prompt_json TEXT,
  model TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  rejected_at TEXT,
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (parent_draft_id) REFERENCES drafts(id)
);

CREATE TABLE IF NOT EXISTS telegram_actions (
  id TEXT PRIMARY KEY,
  telegram_user_id TEXT NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  message_id TEXT,
  callback_query_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  payload_json TEXT,
  handled_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS processing_runs (
  id TEXT PRIMARY KEY,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('cron', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  collected_count INTEGER NOT NULL DEFAULT 0,
  normalized_count INTEGER NOT NULL DEFAULT 0,
  deduplicated_count INTEGER NOT NULL DEFAULT 0,
  scored_count INTEGER NOT NULL DEFAULT 0,
  selected_topics_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources(enabled);
CREATE INDEX IF NOT EXISTS idx_collected_items_source_id ON collected_items(source_id);
CREATE INDEX IF NOT EXISTS idx_collected_items_hash ON collected_items(content_hash);
CREATE INDEX IF NOT EXISTS idx_collected_items_status ON collected_items(status);
CREATE INDEX IF NOT EXISTS idx_collected_items_published_at ON collected_items(published_at);
CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);
CREATE INDEX IF NOT EXISTS idx_topics_run ON topics(processing_run_id);
CREATE INDEX IF NOT EXISTS idx_drafts_topic ON drafts(topic_id);
CREATE INDEX IF NOT EXISTS idx_drafts_parent ON drafts(parent_draft_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);
CREATE INDEX IF NOT EXISTS idx_telegram_actions_target ON telegram_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_processing_runs_status ON processing_runs(status);

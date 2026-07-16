CREATE TABLE IF NOT EXISTS draft_briefs (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  central_thesis TEXT NOT NULL,
  author_position TEXT NOT NULL,
  supporting_points_json TEXT NOT NULL,
  source_facts_json TEXT NOT NULL,
  practical_takeaway TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  desired_length TEXT NOT NULL,
  tone TEXT NOT NULL,
  factual_constraints_json TEXT NOT NULL,
  source_item_ids_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  prompt_version TEXT,
  generation_metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

ALTER TABLE drafts ADD COLUMN draft_brief_id TEXT;
ALTER TABLE drafts ADD COLUMN revision_type TEXT;
ALTER TABLE drafts ADD COLUMN user_instruction TEXT;
ALTER TABLE drafts ADD COLUMN prompt_version TEXT;
ALTER TABLE drafts ADD COLUMN generation_metadata_json TEXT;
ALTER TABLE drafts ADD COLUMN source_snapshot_json TEXT;
ALTER TABLE drafts ADD COLUMN factual_review_json TEXT;

CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT,
  prompt_version TEXT NOT NULL,
  request_type TEXT NOT NULL,
  token_usage_json TEXT,
  latency_ms INTEGER,
  status TEXT NOT NULL,
  error_type TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_states (
  id TEXT PRIMARY KEY,
  telegram_user_id TEXT NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  state_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_draft_briefs_topic ON draft_briefs(topic_id);
CREATE INDEX IF NOT EXISTS idx_drafts_brief ON drafts(draft_brief_id);
CREATE INDEX IF NOT EXISTS idx_drafts_parent ON drafts(parent_draft_id);
CREATE INDEX IF NOT EXISTS idx_drafts_revision_type ON drafts(revision_type);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created ON ai_generation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_states_user ON conversation_states(telegram_user_id, state_type);

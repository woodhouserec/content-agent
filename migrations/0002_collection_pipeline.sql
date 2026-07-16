ALTER TABLE collected_items ADD COLUMN canonical_url TEXT;
ALTER TABLE collected_items ADD COLUMN last_seen_at TEXT;

ALTER TABLE processing_runs ADD COLUMN processed_sources_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE processing_runs ADD COLUMN successful_sources_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE processing_runs ADD COLUMN failed_sources_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE processing_runs ADD COLUMN received_items_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE processing_runs ADD COLUMN new_items_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE processing_runs ADD COLUMN duplicate_items_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE processing_runs ADD COLUMN source_errors_json TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_collected_items_canonical_url_unique
  ON collected_items(canonical_url)
  WHERE canonical_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_collected_items_source_external_unique
  ON collected_items(source_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_collected_items_content_hash_unique
  ON collected_items(content_hash);

CREATE INDEX IF NOT EXISTS idx_collected_items_last_seen_at ON collected_items(last_seen_at);

CREATE TABLE IF NOT EXISTS visual_briefs (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  concept TEXT NOT NULL,
  metaphor TEXT,
  composition TEXT,
  style TEXT,
  color_direction TEXT,
  aspect_ratio TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (draft_id) REFERENCES drafts(id)
);

CREATE TABLE IF NOT EXISTS visual_assets (
  id TEXT PRIMARY KEY,
  visual_brief_id TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  generation_provider TEXT,
  generation_model TEXT,
  generation_prompt TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  parent_asset_id TEXT,
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TEXT NOT NULL,
  approved_at TEXT,
  rejected_at TEXT,
  FOREIGN KEY (visual_brief_id) REFERENCES visual_briefs(id),
  FOREIGN KEY (parent_asset_id) REFERENCES visual_assets(id)
);

CREATE INDEX IF NOT EXISTS idx_visual_briefs_topic ON visual_briefs(topic_id);
CREATE INDEX IF NOT EXISTS idx_visual_briefs_draft ON visual_briefs(draft_id);
CREATE INDEX IF NOT EXISTS idx_visual_briefs_status ON visual_briefs(status);
CREATE INDEX IF NOT EXISTS idx_visual_assets_brief ON visual_assets(visual_brief_id);
CREATE INDEX IF NOT EXISTS idx_visual_assets_parent ON visual_assets(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_visual_assets_status ON visual_assets(status);

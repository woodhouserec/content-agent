ALTER TABLE collected_items ADD COLUMN rule_score REAL;
ALTER TABLE collected_items ADD COLUMN ai_score REAL;
ALTER TABLE collected_items ADD COLUMN final_score REAL;
ALTER TABLE collected_items ADD COLUMN scoring_breakdown_json TEXT;
ALTER TABLE collected_items ADD COLUMN scored_at TEXT;
ALTER TABLE collected_items ADD COLUMN scoring_version TEXT;

ALTER TABLE topics ADD COLUMN why_it_matters TEXT;
ALTER TABLE topics ADD COLUMN suggested_angle TEXT;
ALTER TABLE topics ADD COLUMN target_audience TEXT;
ALTER TABLE topics ADD COLUMN novelty_score REAL;
ALTER TABLE topics ADD COLUMN topic_fingerprint TEXT;
ALTER TABLE topics ADD COLUMN ai_reasoning_summary TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_topics_fingerprint_unique
  ON topics(topic_fingerprint)
  WHERE topic_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collected_items_final_score ON collected_items(final_score);
CREATE INDEX IF NOT EXISTS idx_collected_items_scored_at ON collected_items(scored_at);
CREATE INDEX IF NOT EXISTS idx_topics_novelty_score ON topics(novelty_score);

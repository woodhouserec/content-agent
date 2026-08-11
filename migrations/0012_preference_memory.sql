ALTER TABLE relevance_profiles ADD COLUMN memory_json TEXT NOT NULL DEFAULT '{"writing_preferences":[],"visual_preferences":[],"topic_preferences":[],"avoid":[],"updated_at":null}';

CREATE TABLE IF NOT EXISTS preference_events (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  signal TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES relevance_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_preference_events_profile_created
  ON preference_events(profile_id, created_at);

CREATE INDEX IF NOT EXISTS idx_preference_events_type
  ON preference_events(event_type, target_type);

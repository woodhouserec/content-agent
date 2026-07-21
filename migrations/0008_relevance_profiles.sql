CREATE TABLE IF NOT EXISTS relevance_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  focus_json TEXT NOT NULL,
  audience_json TEXT NOT NULL,
  tone TEXT NOT NULL,
  position TEXT NOT NULL,
  min_rule_score INTEGER NOT NULL,
  min_final_score_for_topic INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_relevance_profiles_active ON relevance_profiles(is_active, deleted_at);
CREATE INDEX IF NOT EXISTS idx_relevance_profiles_deleted ON relevance_profiles(deleted_at);

INSERT INTO relevance_profiles (
  id, name, role, focus_json, audience_json, tone, position,
  min_rule_score, min_final_score_for_topic, is_active, created_at, updated_at, deleted_at
)
SELECT
  'profile_base',
  'Базовый',
  'UI/UX and Product Designer and Analyst, Startup Founder',
  '["Product Design","UX Research","Design Systems","AI in Design","Human-Computer Interaction","Accessibility","SaaS Product Design","Product Strategy","UX Metrics","Design Operations","Startups","Foundraising"]',
  '["Product Designers","UI/UX Designers","Design Leads","Product Managers","Founders","SaaS specialists","HR''s"]',
  'thoughtful, confident, non-promotional',
  'practitioner insight, not news retelling',
  60,
  70,
  1,
  datetime('now'),
  datetime('now'),
  NULL
WHERE NOT EXISTS (SELECT 1 FROM relevance_profiles WHERE id = 'profile_base');

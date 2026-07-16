CREATE TABLE IF NOT EXISTS pending_sources (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  status TEXT NOT NULL,
  detected_type TEXT,
  feed_title TEXT,
  preview_json TEXT,
  error_message TEXT,
  created_by_telegram_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_sources_normalized_url ON pending_sources(normalized_url);
CREATE INDEX IF NOT EXISTS idx_pending_sources_status ON pending_sources(status);

UPDATE sources SET config_json = json_patch(COALESCE(config_json, '{}'), '{
  "author_name": "Nielsen Norman Group",
  "source_tier": "primary",
  "content_kind": "original_research",
  "language": "en",
  "topic_tags": ["UX Research", "Human-Computer Interaction", "UX Metrics", "Accessibility"],
  "trust_score": 95,
  "editorial_priority": 5,
  "max_content_age_days": 30,
  "allow_full_text": false,
  "license_notes": "Use excerpts and metadata only.",
  "max_items_per_run": 5
}') WHERE id = 'src_nngroup_articles';

UPDATE sources SET config_json = json_patch(COALESCE(config_json, '{}'), '{
  "author_name": "Smashing Magazine",
  "source_tier": "professional",
  "content_kind": "author_essay",
  "language": "en",
  "topic_tags": ["Product Design", "Design Systems", "Accessibility", "Frontend UX"],
  "trust_score": 85,
  "editorial_priority": 4,
  "max_content_age_days": 21,
  "allow_full_text": false,
  "license_notes": "Use excerpts and metadata only.",
  "max_items_per_run": 5
}') WHERE id = 'src_smashing_magazine';

UPDATE sources SET config_json = json_patch(COALESCE(config_json, '{}'), '{
  "author_name": "A List Apart",
  "source_tier": "professional",
  "content_kind": "author_essay",
  "language": "en",
  "topic_tags": ["Product Design", "Accessibility", "Design Operations"],
  "trust_score": 80,
  "editorial_priority": 3,
  "max_content_age_days": 45,
  "allow_full_text": false,
  "license_notes": "Use excerpts and metadata only.",
  "max_items_per_run": 5
}') WHERE id = 'src_a_list_apart';

UPDATE sources SET config_json = json_patch(COALESCE(config_json, '{}'), '{
  "author_name": "Intercom",
  "source_tier": "professional",
  "content_kind": "case_study",
  "language": "en",
  "topic_tags": ["SaaS Product Design", "Product Strategy", "Startups"],
  "trust_score": 82,
  "editorial_priority": 4,
  "max_content_age_days": 30,
  "allow_full_text": false,
  "license_notes": "Use excerpts and metadata only.",
  "max_items_per_run": 5
}') WHERE id = 'src_intercom_blog';

UPDATE sources SET config_json = json_patch(COALESCE(config_json, '{}'), '{
  "author_name": "Product Talk",
  "source_tier": "primary",
  "content_kind": "author_essay",
  "language": "en",
  "topic_tags": ["Product Strategy", "UX Research", "Product Discovery", "Startups"],
  "trust_score": 90,
  "editorial_priority": 5,
  "max_content_age_days": 45,
  "allow_full_text": false,
  "license_notes": "Use excerpts and metadata only.",
  "max_items_per_run": 5
}') WHERE id = 'src_product_talk';

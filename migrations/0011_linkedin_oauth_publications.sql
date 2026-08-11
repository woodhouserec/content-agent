CREATE TABLE IF NOT EXISTS linkedin_oauth_states (
  state TEXT PRIMARY KEY,
  telegram_user_id TEXT NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_linkedin_oauth_states_expires_at
  ON linkedin_oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS linkedin_connections (
  id TEXT PRIMARY KEY,
  telegram_user_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  author_urn TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NULL,
  scope TEXT NULL,
  expires_at TEXT NOT NULL,
  refresh_expires_at TEXT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_linkedin_connections_telegram_user_id
  ON linkedin_connections(telegram_user_id);

CREATE TABLE IF NOT EXISTS linkedin_publications (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  telegram_user_id TEXT NOT NULL,
  author_urn TEXT NOT NULL,
  linkedin_post_urn TEXT NULL,
  status TEXT NOT NULL,
  error_message TEXT NULL,
  published_at TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (draft_id) REFERENCES drafts(id)
);

CREATE INDEX IF NOT EXISTS idx_linkedin_publications_draft_id
  ON linkedin_publications(draft_id);

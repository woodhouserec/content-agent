INSERT INTO sources (id, type, name, url, config_json, enabled, created_at, updated_at)
VALUES
  (
    'src_reddit_userexperience',
    'reddit',
    'Reddit r/userexperience',
    'https://www.reddit.com/r/userexperience/top.json?t=week',
    '{"subreddit":"userexperience","listing":"top","timeframe":"week","allowedSubreddits":["userexperience"],"source_tier":"community","content_kind":"community_discussion","language":"en","topic_tags":["Product Design","UX Research","Human-Computer Interaction"],"trust_score":64,"editorial_priority":3,"max_content_age_days":14,"allow_full_text":false,"license_notes":"Use post excerpts and metadata only. Do not collect comments.","max_items_per_run":5}',
    0,
    strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    strftime('%Y-%m-%dT%H:%M:%fZ','now')
  ),
  (
    'src_reddit_uxdesign',
    'reddit',
    'Reddit r/UXDesign',
    'https://www.reddit.com/r/UXDesign/top.json?t=week',
    '{"subreddit":"UXDesign","listing":"top","timeframe":"week","allowedSubreddits":["UXDesign"],"source_tier":"community","content_kind":"community_discussion","language":"en","topic_tags":["Product Design","Design Systems","AI in Design","UX Research"],"trust_score":64,"editorial_priority":3,"max_content_age_days":14,"allow_full_text":false,"license_notes":"Use post excerpts and metadata only. Do not collect comments.","max_items_per_run":5}',
    0,
    strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    strftime('%Y-%m-%dT%H:%M:%fZ','now')
  ),
  (
    'src_reddit_productmanagement',
    'reddit',
    'Reddit r/ProductManagement',
    'https://www.reddit.com/r/ProductManagement/top.json?t=week',
    '{"subreddit":"ProductManagement","listing":"top","timeframe":"week","allowedSubreddits":["ProductManagement"],"source_tier":"community","content_kind":"community_discussion","language":"en","topic_tags":["Product Strategy","SaaS Product Design","Startups","UX Metrics"],"trust_score":68,"editorial_priority":3,"max_content_age_days":14,"allow_full_text":false,"license_notes":"Use post excerpts and metadata only. Do not collect comments.","max_items_per_run":5}',
    0,
    strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    strftime('%Y-%m-%dT%H:%M:%fZ','now')
  ),
  (
    'src_reddit_uxresearch',
    'reddit',
    'Reddit r/UXResearch',
    'https://www.reddit.com/r/UXResearch/top.json?t=week',
    '{"subreddit":"UXResearch","listing":"top","timeframe":"week","allowedSubreddits":["UXResearch"],"source_tier":"community","content_kind":"community_discussion","language":"en","topic_tags":["UX Research","UX Metrics","Human-Computer Interaction","Product Design"],"trust_score":65,"editorial_priority":3,"max_content_age_days":14,"allow_full_text":false,"license_notes":"Use post excerpts and metadata only. Do not collect comments.","max_items_per_run":5}',
    0,
    strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    strftime('%Y-%m-%dT%H:%M:%fZ','now')
  ),
  (
    'src_reddit_designsystems',
    'reddit',
    'Reddit r/designsystems',
    'https://www.reddit.com/r/designsystems/top.json?t=week',
    '{"subreddit":"designsystems","listing":"top","timeframe":"week","allowedSubreddits":["designsystems"],"source_tier":"community","content_kind":"community_discussion","language":"en","topic_tags":["Design Systems","Design Operations","Product Design"],"trust_score":62,"editorial_priority":2,"max_content_age_days":21,"allow_full_text":false,"license_notes":"Use post excerpts and metadata only. Do not collect comments.","max_items_per_run":4}',
    0,
    strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    strftime('%Y-%m-%dT%H:%M:%fZ','now')
  ),
  (
    'src_reddit_accessibility',
    'reddit',
    'Reddit r/accessibility',
    'https://www.reddit.com/r/accessibility/top.json?t=week',
    '{"subreddit":"accessibility","listing":"top","timeframe":"week","allowedSubreddits":["accessibility"],"source_tier":"community","content_kind":"community_discussion","language":"en","topic_tags":["Accessibility","Human-Computer Interaction","Product Design"],"trust_score":64,"editorial_priority":3,"max_content_age_days":21,"allow_full_text":false,"license_notes":"Use post excerpts and metadata only. Do not collect comments.","max_items_per_run":4}',
    0,
    strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    strftime('%Y-%m-%dT%H:%M:%fZ','now')
  ),
  (
    'src_reddit_saas',
    'reddit',
    'Reddit r/SaaS',
    'https://www.reddit.com/r/SaaS/top.json?t=week',
    '{"subreddit":"SaaS","listing":"top","timeframe":"week","allowedSubreddits":["SaaS"],"source_tier":"community","content_kind":"community_discussion","language":"en","topic_tags":["SaaS Product Design","Startups","Product Strategy"],"trust_score":58,"editorial_priority":2,"max_content_age_days":14,"allow_full_text":false,"license_notes":"Use post excerpts and metadata only. Do not collect comments.","max_items_per_run":4}',
    0,
    strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    strftime('%Y-%m-%dT%H:%M:%fZ','now')
  )
ON CONFLICT(id) DO UPDATE SET
  type = excluded.type,
  name = excluded.name,
  url = excluded.url,
  config_json = excluded.config_json,
  enabled = 0,
  updated_at = excluded.updated_at;

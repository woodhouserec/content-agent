INSERT INTO sources (id, type, name, url, config_json, enabled, created_at, updated_at)
VALUES
  (
    'src_nngroup_articles',
    'rss',
    'Nielsen Norman Group Articles',
    'https://www.nngroup.com/feed/rss/',
    '{"limit":5}',
    1,
    '2026-07-17T00:00:00.000Z',
    '2026-07-17T00:00:00.000Z'
  ),
  (
    'src_smashing_magazine',
    'rss',
    'Smashing Magazine',
    'https://www.smashingmagazine.com/feed/',
    '{"limit":5}',
    1,
    '2026-07-17T00:00:00.000Z',
    '2026-07-17T00:00:00.000Z'
  ),
  (
    'src_a_list_apart',
    'rss',
    'A List Apart',
    'https://alistapart.com/main/feed/',
    '{"limit":5}',
    1,
    '2026-07-17T00:00:00.000Z',
    '2026-07-17T00:00:00.000Z'
  ),
  (
    'src_intercom_blog',
    'rss',
    'Intercom Blog',
    'https://www.intercom.com/blog/feed/',
    '{"limit":5}',
    1,
    '2026-07-17T00:00:00.000Z',
    '2026-07-17T00:00:00.000Z'
  ),
  (
    'src_product_talk',
    'rss',
    'Product Talk',
    'https://www.producttalk.org/feed/',
    '{"limit":5}',
    1,
    '2026-07-17T00:00:00.000Z',
    '2026-07-17T00:00:00.000Z'
  ),
  (
    'src_reddit_userexperience',
    'reddit',
    'Reddit r/userexperience',
    'https://www.reddit.com/r/userexperience/top.json?t=week',
    '{"subreddit":"userexperience","listing":"top","timeframe":"week","limit":5,"allowedSubreddits":["userexperience","UXDesign"]}',
    0,
    '2026-07-17T00:00:00.000Z',
    '2026-07-17T00:00:00.000Z'
  ),
  (
    'src_reddit_uxdesign',
    'reddit',
    'Reddit r/UXDesign',
    'https://www.reddit.com/r/UXDesign/top.json?t=week',
    '{"subreddit":"UXDesign","listing":"top","timeframe":"week","limit":5,"allowedSubreddits":["userexperience","UXDesign"]}',
    0,
    '2026-07-17T00:00:00.000Z',
    '2026-07-17T00:00:00.000Z'
  )
ON CONFLICT(id) DO UPDATE SET
  type = excluded.type,
  name = excluded.name,
  url = excluded.url,
  config_json = excluded.config_json,
  enabled = sources.enabled,
  updated_at = excluded.updated_at;

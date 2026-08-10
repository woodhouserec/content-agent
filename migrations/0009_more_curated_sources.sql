INSERT INTO sources (id, type, name, url, config_json, enabled, created_at, updated_at)
VALUES
  (
    'src_ux_collective',
    'rss',
    'UX Collective',
    'https://uxdesign.cc/feed',
    '{"author_name":"UX Collective","source_tier":"professional","content_kind":"author_essay","language":"en","topic_tags":["Product Design","UX Research","AI in Design","Design Operations"],"trust_score":82,"editorial_priority":4,"max_content_age_days":21,"allow_full_text":false,"license_notes":"Use excerpts and metadata only.","max_items_per_run":5}',
    1,
    '2026-08-11T00:00:00.000Z',
    '2026-08-11T00:00:00.000Z'
  ),
  (
    'src_ux_planet',
    'rss',
    'UX Planet',
    'https://uxplanet.org/feed',
    '{"author_name":"UX Planet","source_tier":"discovery","content_kind":"author_essay","language":"en","topic_tags":["Product Design","UX Research","AI in Design"],"trust_score":68,"editorial_priority":2,"max_content_age_days":14,"allow_full_text":false,"license_notes":"Use excerpts and metadata only.","max_items_per_run":4}',
    1,
    '2026-08-11T00:00:00.000Z',
    '2026-08-11T00:00:00.000Z'
  ),
  (
    'src_baymard',
    'rss',
    'Baymard Institute',
    'https://baymard.com/blog/rss',
    '{"author_name":"Baymard Institute","source_tier":"primary","content_kind":"original_research","language":"en","topic_tags":["UX Research","UX Metrics","SaaS Product Design","Accessibility"],"trust_score":94,"editorial_priority":5,"max_content_age_days":45,"allow_full_text":false,"license_notes":"Use excerpts and metadata only.","max_items_per_run":4}',
    1,
    '2026-08-11T00:00:00.000Z',
    '2026-08-11T00:00:00.000Z'
  ),
  (
    'src_a11y_project',
    'rss',
    'The A11Y Project',
    'https://www.a11yproject.com/feed/feed.xml',
    '{"author_name":"The A11Y Project","source_tier":"professional","content_kind":"author_essay","language":"en","topic_tags":["Accessibility","Human-Computer Interaction","Product Design"],"trust_score":86,"editorial_priority":4,"max_content_age_days":45,"allow_full_text":false,"license_notes":"Use excerpts and metadata only.","max_items_per_run":4}',
    1,
    '2026-08-11T00:00:00.000Z',
    '2026-08-11T00:00:00.000Z'
  ),
  (
    'src_web_dev',
    'rss',
    'web.dev',
    'https://web.dev/feed.xml',
    '{"author_name":"Google web.dev","source_tier":"primary","content_kind":"product_update","language":"en","topic_tags":["Accessibility","Human-Computer Interaction","Frontend UX","Product Design"],"trust_score":88,"editorial_priority":3,"max_content_age_days":21,"allow_full_text":false,"license_notes":"Use excerpts and metadata only.","max_items_per_run":4}',
    1,
    '2026-08-11T00:00:00.000Z',
    '2026-08-11T00:00:00.000Z'
  ),
  (
    'src_mind_the_product',
    'rss',
    'Mind the Product',
    'https://www.mindtheproduct.com/feed/',
    '{"author_name":"Mind the Product","source_tier":"professional","content_kind":"author_essay","language":"en","topic_tags":["Product Strategy","SaaS Product Design","Startups","UX Research"],"trust_score":84,"editorial_priority":4,"max_content_age_days":21,"allow_full_text":false,"license_notes":"Use excerpts and metadata only.","max_items_per_run":5}',
    1,
    '2026-08-11T00:00:00.000Z',
    '2026-08-11T00:00:00.000Z'
  ),
  (
    'src_first_round_review',
    'rss',
    'First Round Review',
    'https://review.firstround.com/rss',
    '{"author_name":"First Round Review","source_tier":"professional","content_kind":"case_study","language":"en","topic_tags":["Startups","Product Strategy","Foundraising","Design Operations"],"trust_score":88,"editorial_priority":4,"max_content_age_days":60,"allow_full_text":false,"license_notes":"Use excerpts and metadata only.","max_items_per_run":4}',
    1,
    '2026-08-11T00:00:00.000Z',
    '2026-08-11T00:00:00.000Z'
  ),
  (
    'src_figma_blog',
    'rss',
    'Figma Blog',
    'https://www.figma.com/blog/feed/',
    '{"author_name":"Figma","source_tier":"primary","content_kind":"product_update","language":"en","topic_tags":["AI in Design","Design Systems","Product Design","Design Operations"],"trust_score":86,"editorial_priority":4,"max_content_age_days":21,"allow_full_text":false,"license_notes":"Use excerpts and metadata only.","max_items_per_run":5}',
    1,
    '2026-08-11T00:00:00.000Z',
    '2026-08-11T00:00:00.000Z'
  ),
  (
    'src_lenny_newsletter',
    'rss',
    'Lenny Newsletter',
    'https://www.lennysnewsletter.com/feed',
    '{"author_name":"Lenny Rachitsky","source_tier":"professional","content_kind":"author_essay","language":"en","topic_tags":["Product Strategy","SaaS Product Design","Startups","UX Metrics"],"trust_score":88,"editorial_priority":4,"max_content_age_days":45,"allow_full_text":false,"license_notes":"Use excerpts and metadata only.","max_items_per_run":4}',
    1,
    '2026-08-11T00:00:00.000Z',
    '2026-08-11T00:00:00.000Z'
  ),
  (
    'src_svpg_articles',
    'rss',
    'Silicon Valley Product Group',
    'https://www.svpg.com/articles/feed/',
    '{"author_name":"Silicon Valley Product Group","source_tier":"professional","content_kind":"author_essay","language":"en","topic_tags":["Product Strategy","Product Design","Startups","SaaS Product Design"],"trust_score":90,"editorial_priority":5,"max_content_age_days":60,"allow_full_text":false,"license_notes":"Use excerpts and metadata only.","max_items_per_run":4}',
    1,
    '2026-08-11T00:00:00.000Z',
    '2026-08-11T00:00:00.000Z'
  ),
  (
    'src_measuringu',
    'rss',
    'MeasuringU',
    'https://measuringu.com/feed/',
    '{"author_name":"MeasuringU","source_tier":"primary","content_kind":"original_research","language":"en","topic_tags":["UX Research","UX Metrics","Human-Computer Interaction"],"trust_score":92,"editorial_priority":5,"max_content_age_days":60,"allow_full_text":false,"license_notes":"Use excerpts and metadata only.","max_items_per_run":4}',
    1,
    '2026-08-11T00:00:00.000Z',
    '2026-08-11T00:00:00.000Z'
  ),
  (
    'src_uxmatters',
    'rss',
    'UXmatters',
    'https://www.uxmatters.com/index.xml',
    '{"author_name":"UXmatters","source_tier":"professional","content_kind":"author_essay","language":"en","topic_tags":["UX Research","Product Design","Human-Computer Interaction","Accessibility"],"trust_score":80,"editorial_priority":3,"max_content_age_days":60,"allow_full_text":false,"license_notes":"Use excerpts and metadata only.","max_items_per_run":4}',
    1,
    '2026-08-11T00:00:00.000Z',
    '2026-08-11T00:00:00.000Z'
  )
ON CONFLICT(id) DO UPDATE SET
  type = excluded.type,
  name = excluded.name,
  url = excluded.url,
  config_json = excluded.config_json,
  enabled = sources.enabled,
  updated_at = excluded.updated_at;

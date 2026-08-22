UPDATE sources
SET url = 'https://feeds.baymard.com/baymard',
    updated_at = '2026-08-22T00:00:00.000Z'
WHERE id = 'src_baymard';

UPDATE sources
SET url = 'https://www.figma.com/blog/feed/atom.xml',
    updated_at = '2026-08-22T00:00:00.000Z'
WHERE id = 'src_figma_blog';

UPDATE sources
SET url = 'https://review.firstround.com/articles/rss/',
    updated_at = '2026-08-22T00:00:00.000Z'
WHERE id = 'src_first_round_review';

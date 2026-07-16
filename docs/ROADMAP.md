# Content Agent Roadmap

## Current Stage: Collection

The current implementation collects materials from configured sources and stores normalized records in D1.

It does not call OpenAI.
It does not generate topics.
It does not generate LinkedIn drafts.
It does not generate images.

## Later Text Flow

The planned text flow is:

```text
collected_items -> topics -> drafts -> review -> approval
```

## Later Visual Flow

The planned visual flow is:

```text
topic -> draft -> visual brief -> generated assets -> review -> approval
```

Future D1 metadata tables are already reserved:

- `visual_briefs`
- `visual_assets`

Image binaries must not be stored in D1.
Future binary storage should use Cloudflare R2.
D1 should store only metadata and `storage_key`.

## Future Visual Interfaces

The codebase reserves domain interfaces for:

- `VisualBriefGenerator`
- `ImageGenerationProvider`
- `AssetStorage`
- `VisualReviewService`

No concrete image model is connected yet.
No R2 binding is configured yet.

## Future Telegram Visual Moderation

Future Telegram moderation should support:

- `Создать иллюстрацию`
- `Другой вариант`
- `Изменить концепцию`
- `Одобрить изображение`
- `Отклонить изображение`

## Visual Strategy

The intended profile style:

- editorial vector illustration;
- authorial conceptual metaphors;
- no photorealism;
- consistent palette and composition system;
- minimal text inside images;
- recognizable visual style across posts;
- future support for LinkedIn carousel assets.

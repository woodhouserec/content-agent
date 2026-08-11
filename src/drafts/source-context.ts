import type { Env } from "../domain/runtime";
import type { TopicRecord } from "../storage/topics";
import { createRepositories } from "../storage/repositories";
import { normalizeWhitespace, stripHtml, truncateText } from "../utils/text";
import { draftConfig } from "./config";
import type { GroundedSource } from "./types";

export async function buildGroundedSourceContext(env: Env, topic: TopicRecord): Promise<GroundedSource[]> {
  const repos = createRepositories(env.DB);
  const ids = parseSourceIds(topic.source_item_ids_json);
  const items = await repos.collectedItems.getByIds(ids);

  const sources = items.slice(0, draftConfig.maxGroundedSources).map((item): GroundedSource => {
    const metadata = parseMetadata(item.metadata_json);
    const text = normalizeWhitespace(stripHtml(item.normalized_content ?? item.raw_content ?? item.summary ?? "") ?? "") ?? "";

    return {
      id: item.id,
      title: item.title,
      author: item.author,
      publishedAt: item.published_at,
      canonicalUrl: item.canonical_url ?? item.url,
      summary: truncateText(normalizeWhitespace(stripHtml(item.summary ?? "") ?? "") ?? "", draftConfig.maxSourceSummaryLength) ?? null,
      excerpt: truncateText(text, draftConfig.maxSourceExcerptLength) ?? "",
      extractionStatus: typeof metadata.extraction_status === "string" ? metadata.extraction_status : null
    };
  });

  const usable = sources.filter((source) => source.title && (source.summary || source.excerpt) && source.canonicalUrl);
  if (usable.length === 0) {
    throw new Error("Not enough source context to generate a grounded draft");
  }

  const serialized = JSON.stringify(usable);
  if (serialized.length <= draftConfig.maxSourceContextLength) {
    return usable;
  }

  const sourceBudget = Math.max(300, Math.floor(draftConfig.maxSourceContextLength / usable.length));
  return usable.map((source) => {
    const fixedFieldLength = source.title.length + source.canonicalUrl.length + (source.summary?.length ?? 0);
    const excerptLimit = Math.max(180, sourceBudget - fixedFieldLength - 120);
    return {
      ...source,
      summary: source.summary ? truncateText(source.summary, Math.min(source.summary.length, 360)) ?? "" : null,
      excerpt: truncateText(source.excerpt, excerptLimit) ?? ""
    };
  });
}

export function parseSourceIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function parseMetadata(value: string | null): Record<string, unknown> {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

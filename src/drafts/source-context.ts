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

  const sources = items.map((item): GroundedSource => {
    const metadata = parseMetadata(item.metadata_json);
    const text = normalizeWhitespace(stripHtml(item.normalized_content ?? item.raw_content ?? item.summary ?? "") ?? "") ?? "";

    return {
      id: item.id,
      title: item.title,
      author: item.author,
      publishedAt: item.published_at,
      canonicalUrl: item.canonical_url ?? item.url,
      summary: item.summary,
      excerpt: truncateText(text, 1100) ?? "",
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

  let remaining = draftConfig.maxSourceContextLength;
  return usable.map((source) => {
    const excerptLimit = Math.max(250, Math.floor((remaining - source.title.length - source.canonicalUrl.length) / usable.length));
    remaining -= excerptLimit;
    return { ...source, excerpt: truncateText(source.excerpt, excerptLimit) ?? "" };
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


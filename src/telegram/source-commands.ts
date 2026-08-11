import type { Env } from "../domain/runtime";
import { createRepositories } from "../storage/repositories";
import type { SourceRecord } from "../storage/sources";
import { canonicalizeUrl } from "../utils/url";
import { validateRssSourceUrl } from "../sources/source-validation";
import type { TelegramClient } from "./client";
import { getCollectorForSource } from "../collectors";

export async function handleAddSource(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, text: string | undefined): Promise<void> {
  const url = text?.trim().split(/\s+/)[1];

  if (!url) {
    await telegram.sendMessage(chatId, "Используйте: /addsource https://example.com/feed.xml или /addsource https://example.com/design/");
    return;
  }

  const repos = createRepositories(env.DB);
  const validation = await validateRssSourceUrl(url);

  if (validation.normalizedUrl.startsWith("http")) {
    const duplicate = await repos.sources.findByUrl(validation.normalizedUrl);

    if (duplicate) {
      await telegram.sendMessage(chatId, `Источник уже существует: ${duplicate.name}\nID: ${duplicate.id}\nStatus: ${formatSourceStatus(duplicate.enabled)}`);
      return;
    }
  }

  const pending = await repos.pendingSources.create({
    url,
    normalizedUrl: validation.normalizedUrl,
    status: validation.ok ? "pending" : "unsupported",
    detectedType: validation.detectedType,
    feedTitle: validation.feedTitle,
    preview: validation,
    errorMessage: validation.errorMessage,
    telegramUserId
  });

  if (!validation.ok) {
    await telegram.sendMessage(chatId, [
      "Источник не добавлен.",
      `URL: ${validation.normalizedUrl}`,
      `Статус: unsupported`,
      `Причина: ${validation.errorMessage}`,
      "Полный scraping, JavaScript и обход ограничений не используются. Возможные варианты: найти RSS/Atom, официальный API или добавить ручной интеграционный план."
    ].join("\n"));
    return;
  }

  await telegram.sendMessage(chatId, formatSourcePreview(validation), {
    replyMarkup: {
      inline_keyboard: [[{ text: "Добавить источник", callback_data: `addsource:confirm:${pending.id}` }]]
    }
  });
}

export async function handleSources(env: Env, telegram: TelegramClient, chatId: string): Promise<void> {
  const repos = createRepositories(env.DB);
  const sources = await repos.sources.listAll();

  if (sources.length === 0) {
    await telegram.sendMessage(chatId, "Источников пока нет.");
    return;
  }

  const chunks = chunkSourceMessages(sources.map((source, index) => `Источник ${index + 1} из ${sources.length}:\n${formatSourceLine(source)}`));
  for (const chunk of chunks) {
    await telegram.sendMessage(chatId, chunk);
  }
}

export async function handleSourceDisable(env: Env, telegram: TelegramClient, chatId: string, text: string | undefined): Promise<void> {
  const id = text?.trim().split(/\s+/)[1];

  if (!id) {
    await telegram.sendMessage(chatId, "Используйте: /source_disable source_id");
    return;
  }

  const disabled = await createRepositories(env.DB).sources.disable(id);
  await telegram.sendMessage(chatId, disabled ? `Источник отключён: ${id}` : `Источник не найден: ${id}`);
}

export async function handleSourceTest(env: Env, telegram: TelegramClient, chatId: string, text: string | undefined): Promise<void> {
  const id = text?.trim().split(/\s+/)[1];

  if (!id) {
    await telegram.sendMessage(chatId, "Используйте: /source_test source_id");
    return;
  }

  const repos = createRepositories(env.DB);
  const source = await repos.sources.getById(id);

  if (!source) {
    await telegram.sendMessage(chatId, `Источник не найден: ${id}`);
    return;
  }

  const collector = getCollectorForSource(source);

  if (!collector) {
    await telegram.sendMessage(chatId, `Для типа источника пока нет collector: ${source.type}`);
    return;
  }

  const result = await collector.collect(source, {
    maxItemsPerSource: 3,
    timeoutMs: 6000,
    retries: 1,
    userAgent: "ContentAgent/0.3 SourceTest (+https://github.com/woodhouserec/content-agent)"
  });

  await telegram.sendMessage(chatId, [
    `Тест источника: ${source.name}`,
    `OK: ${result.ok ? "да" : "нет"}`,
    `Материалов получено: ${result.items.length}`,
    `Ошибок: ${result.errors.length}`,
    ...result.errors.slice(0, 3).map((error) => `- ${error.stage}: ${error.message}`)
  ].join("\n"));
}

export async function confirmPendingSource(env: Env, pendingId: string): Promise<string> {
  const repos = createRepositories(env.DB);
  const pending = await repos.pendingSources.getById(pendingId);

  if (!pending) {
    return "Проверка источника не найдена или устарела.";
  }

  if (pending.status !== "pending" || pending.detected_type === "unsupported") {
    return `Источник нельзя добавить. Статус: ${pending.status}. ${pending.error_message ?? ""}`;
  }

  const duplicate = await repos.sources.findByUrl(pending.normalized_url);

  if (duplicate) {
    await repos.pendingSources.markConfirmed(pending.id);
    return `Источник уже есть: ${duplicate.name}`;
  }

  const isDiscoveryPage = pending.detected_type === "discovery_page";
  const source = await repos.sources.create({
    type: "rss",
    name: pending.feed_title ?? new URL(pending.normalized_url).hostname,
    url: pending.normalized_url,
    enabled: true,
    config: {
      ...(isDiscoveryPage ? { collector_type: "discovery_page" } : {}),
      author_name: pending.feed_title ?? new URL(pending.normalized_url).hostname,
      source_tier: "discovery",
      content_kind: "news",
      language: "en",
      topic_tags: [],
      trust_score: 60,
      editorial_priority: 2,
      max_content_age_days: 14,
      allow_full_text: false,
      license_notes: isDiscoveryPage
        ? "Added via Telegram as static discovery page. Fetch linked article pages with excerpts and metadata only."
        : "Added via Telegram after RSS/Atom validation. Use excerpts and metadata only.",
      ...(isDiscoveryPage ? { article_link_limit: 5 } : {}),
      max_items_per_run: 5
    }
  });
  await repos.pendingSources.markConfirmed(pending.id);

  return `Источник добавлен: ${source.name}\nID: ${source.id}\nStatus: ${formatSourceStatus(source.enabled)}`;
}

function formatSourcePreview(validation: Awaited<ReturnType<typeof validateRssSourceUrl>>): string {
  const samples = validation.sampleItems.map((item, index) => `${index + 1}. ${item.title ?? "Untitled"}`).join("\n");

  return [
    "Источник проверен.",
    `Title: ${validation.feedTitle ?? "unknown"}`,
    `Type: ${validation.detectedType}`,
    `URL: ${validation.normalizedUrl}`,
    "",
    "Примеры:",
    samples || "Нет примеров",
    "",
    "Добавить источник?"
  ].join("\n");
}

export function formatSourceLine(source: SourceRecord): string {
  let config: { collector_type?: string; source_tier?: string; content_kind?: string; trust_score?: number; editorial_priority?: number } = {};

  try {
    config = source.config_json ? JSON.parse(source.config_json) : {};
  } catch {
    config = {};
  }

  return [
    `${source.name}`,
    `Status: ${formatSourceStatus(source.enabled)}`,
    `ID: ${source.id}`,
    `Type: ${config.collector_type ?? source.type}`,
    `Tier: ${config.source_tier ?? "unknown"}, Kind: ${config.content_kind ?? "unknown"}`,
    `Trust: ${config.trust_score ?? "n/a"}, Priority: ${config.editorial_priority ?? "n/a"}`,
    source.url
  ].join("\n");
}

export function formatSourceStatus(enabled: number | boolean): string {
  return enabled ? "On 🟢" : "Off 🔴";
}

function chunkSourceMessages(sourceBlocks: string[]): string[] {
  const maxLength = 3200;
  const chunks: string[] = [];
  let current = "Постоянные источники:\n\n";

  for (const block of sourceBlocks) {
    const next = current.trimEnd() + "\n\n" + block;

    if (next.length > maxLength && current.trim().length > 0) {
      chunks.push(current.trimEnd());
      current = block;
      continue;
    }

    current = next;
  }

  if (current.trim().length > 0) {
    chunks.push(current.trimEnd());
  }

  return chunks;
}

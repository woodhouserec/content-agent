import type { Env } from "../domain/runtime";
import { scoringConfig } from "../scoring/config";
import { createRepositories } from "../storage/repositories";
import type { RelevanceProfileRecord } from "../storage/relevance-profiles";
import type { TelegramClient } from "./client";
import { buildSectionMenu, menuLabels } from "./menu";

type FilterField = "minRuleScore" | "minFinalScoreForTopic";

export async function showThesisFilterSettings(env: Env, telegram: TelegramClient, chatId: string): Promise<void> {
  const profile = await createRepositories(env.DB).relevanceProfiles.getActive();
  if (!profile) {
    await telegram.sendMessage(chatId, "Активный профиль не найден. Сначала создайте или выберите профиль.", {
      replyMarkup: buildSectionMenu("permanentSources")
    });
    return;
  }

  await telegram.sendMessage(chatId, buildThesisFilterMessage(profile), {
    replyMarkup: buildSectionMenu("thesisFilter")
  });
}

export async function softenThesisFilter(env: Env, telegram: TelegramClient, chatId: string): Promise<void> {
  await adjustThesisFilter(env, telegram, chatId, -5);
}

export async function tightenThesisFilter(env: Env, telegram: TelegramClient, chatId: string): Promise<void> {
  await adjustThesisFilter(env, telegram, chatId, 5);
}

export async function requestThesisFilterValue(
  env: Env,
  telegram: TelegramClient,
  chatId: string,
  telegramUserId: string,
  field: FilterField
): Promise<void> {
  const repos = createRepositories(env.DB);
  const profile = await repos.relevanceProfiles.getActive();
  if (!profile) {
    await telegram.sendMessage(chatId, "Активный профиль не найден. Сначала создайте или выберите профиль.", {
      replyMarkup: buildSectionMenu("permanentSources")
    });
    return;
  }

  await repos.conversationStates.set({
    telegramUserId,
    telegramChatId: chatId,
    stateType: "thesis_filter_value",
    targetType: "relevance_profile",
    targetId: field,
    ttlMinutes: 20
  });

  await telegram.sendMessage(chatId, [
    field === "minRuleScore"
      ? "Введите новое значение Min Rule Score от 0 до 100."
      : "Введите новое значение Min Final Score for Topic от 0 до 100.",
    "",
    "Ниже значение = больше материалов и больше шума.",
    "Выше значение = меньше материалов и строже отбор."
  ].join("\n"), {
    replyMarkup: buildSectionMenu("thesisFilter")
  });
}

export async function handleThesisFilterMessage(
  env: Env,
  telegram: TelegramClient,
  chatId: string,
  telegramUserId: string,
  text: string
): Promise<boolean> {
  const repos = createRepositories(env.DB);
  const state = await repos.conversationStates.getActive(telegramUserId, "thesis_filter_value");
  if (!state) {
    return false;
  }

  const trimmed = text.trim();
  if (trimmed === menuLabels.back) {
    await repos.conversationStates.clear(telegramUserId, "thesis_filter_value");
    await showThesisFilterSettings(env, telegram, chatId);
    return true;
  }

  const value = parseScore(trimmed);
  if (value === null) {
    await telegram.sendMessage(chatId, "Введите число от 0 до 100. Например: 55");
    return true;
  }

  const profile = await repos.relevanceProfiles.getActive();
  if (!profile) {
    await repos.conversationStates.clear(telegramUserId, "thesis_filter_value");
    await telegram.sendMessage(chatId, "Активный профиль не найден. Сначала создайте или выберите профиль.", {
      replyMarkup: buildSectionMenu("permanentSources")
    });
    return true;
  }

  const field = state.target_id === "minFinalScoreForTopic" ? "minFinalScoreForTopic" : "minRuleScore";
  const updated = await repos.relevanceProfiles.updateScoringThresholds(profile.id, {
    minRuleScore: field === "minRuleScore" ? value : profile.min_rule_score,
    minFinalScoreForTopic: field === "minFinalScoreForTopic" ? value : profile.min_final_score_for_topic
  });
  await repos.conversationStates.clear(telegramUserId, "thesis_filter_value");

  await telegram.sendMessage(chatId, ["Фильтр обновлён.", "", buildThesisFilterMessage(updated)].join("\n"), {
    replyMarkup: buildSectionMenu("thesisFilter")
  });
  return true;
}

export function buildThesisFilterMessage(profile: Pick<RelevanceProfileRecord, "name" | "min_rule_score" | "min_final_score_for_topic">): string {
  return [
    "Фильтр отбора материалов в тезисы:",
    "",
    `Профиль: ${profile.name}`,
    `Min Rule Score: ${profile.min_rule_score}`,
    "Материалы ниже этого порога не отправляются в AI-анализ.",
    "",
    `Min Final Score for Topic: ${profile.min_final_score_for_topic}`,
    "Материалы ниже этого порога обычно не превращаются в тезисы.",
    "",
    "Как влияет настройка:",
    "Мягче фильтр = больше материалов и больше экспериментов.",
    "Строже фильтр = меньше материалов, но выше точность.",
    "",
    "Системные лимиты сейчас:",
    `Max AI items per run: ${scoringConfig.maxAiScoringItems}`,
    `Max theses per run: ${scoringConfig.maxTopicsPerRun}`,
    `Max text length per material: ${scoringConfig.maxItemTextLength}`
  ].join("\n");
}

async function adjustThesisFilter(env: Env, telegram: TelegramClient, chatId: string, delta: number): Promise<void> {
  const repos = createRepositories(env.DB);
  const profile = await repos.relevanceProfiles.getActive();
  if (!profile) {
    await telegram.sendMessage(chatId, "Активный профиль не найден. Сначала создайте или выберите профиль.", {
      replyMarkup: buildSectionMenu("permanentSources")
    });
    return;
  }

  const updated = await repos.relevanceProfiles.updateScoringThresholds(profile.id, {
    minRuleScore: clampScore(profile.min_rule_score + delta),
    minFinalScoreForTopic: clampScore(profile.min_final_score_for_topic + delta)
  });

  await telegram.sendMessage(chatId, [
    delta < 0 ? "Фильтр стал мягче." : "Фильтр стал строже.",
    "",
    buildThesisFilterMessage(updated)
  ].join("\n"), {
    replyMarkup: buildSectionMenu("thesisFilter")
  });
}

function parseScore(value: string): number | null {
  const number = Number(value.replace(",", "."));
  if (!Number.isFinite(number) || number < 0 || number > 100) {
    return null;
  }

  return Math.round(number);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

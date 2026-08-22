import type { Env } from "../domain/runtime";
import { allowedMaterialMaxAgeDays, getMaterialMaxAgeDays, isAllowedMaterialMaxAgeDays } from "../scoring/material-filter";
import { createRepositories } from "../storage/repositories";
import { parsePreferenceMemory } from "../storage/relevance-profiles";
import { nowIso } from "../utils/time";
import type { TelegramClient } from "./client";
import { buildSectionMenu } from "./menu";

export async function showMaterialFilterSettings(env: Env, telegram: TelegramClient, chatId: string): Promise<void> {
  const profile = await createRepositories(env.DB).relevanceProfiles.getActive();
  if (!profile) {
    await telegram.sendMessage(chatId, "Активный профиль не найден. Сначала создайте или выберите профиль.", {
      replyMarkup: buildSectionMenu("permanentSources")
    });
    return;
  }

  await telegram.sendMessage(chatId, buildMaterialFilterMessage(profile.name, getMaterialMaxAgeDays(profile)), {
    replyMarkup: buildSectionMenu("materialFilter")
  });
}

export async function setMaterialFreshnessFilter(
  env: Env,
  telegram: TelegramClient,
  chatId: string,
  maxContentAgeDays: number
): Promise<void> {
  if (!isAllowedMaterialMaxAgeDays(maxContentAgeDays)) {
    await telegram.sendMessage(chatId, "Такого значения свежести нет в списке настроек.", {
      replyMarkup: buildSectionMenu("materialFilter")
    });
    return;
  }

  const repos = createRepositories(env.DB);
  const profile = await repos.relevanceProfiles.getActive();
  if (!profile) {
    await telegram.sendMessage(chatId, "Активный профиль не найден. Сначала создайте или выберите профиль.", {
      replyMarkup: buildSectionMenu("permanentSources")
    });
    return;
  }

  const memory = parsePreferenceMemory(profile.memory_json);
  memory.material_filter = {
    max_content_age_days: maxContentAgeDays
  };
  memory.updated_at = nowIso();
  await repos.relevanceProfiles.updateMemory(profile.id, memory);

  await telegram.sendMessage(chatId, ["Фильтр материалов обновлён.", "", buildMaterialFilterMessage(profile.name, maxContentAgeDays)].join("\n"), {
    replyMarkup: buildSectionMenu("materialFilter")
  });
}

export function buildMaterialFilterMessage(profileName: string, maxContentAgeDays: number): string {
  return [
    "Фильтр материалов для постоянных источников:",
    "",
    `Профиль: ${profileName}`,
    `Свежесть материала: до ${formatDays(maxContentAgeDays)}`,
    "",
    "Фильтр применяется к генерации тезисов: в работу попадают материалы, опубликованные или впервые собранные в выбранный период.",
    "",
    "Доступные значения:",
    allowedMaterialMaxAgeDays.map((days) => `- до ${formatDays(days)}`).join("\n")
  ].join("\n");
}

function formatDays(days: number): string {
  return days === 1 ? "1 суток" : `${days} дней`;
}

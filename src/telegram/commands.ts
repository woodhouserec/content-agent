import { checkD1 } from "../storage/db";
import { createRepositories } from "../storage/repositories";
import type { Env } from "../domain/runtime";

export async function buildStartMessage(): Promise<string> {
  return [
    "Content Agent запущен.",
    "",
    "Я буду помогать выбирать темы и готовить черновики LinkedIn-постов.",
    "В первом техническом срезе доступны только базовые команды и проверка инфраструктуры.",
    "",
    "Команды:",
    "/help - помощь",
    "/status - статус Worker и D1"
  ].join("\n");
}

export async function buildHelpMessage(): Promise<string> {
  return [
    "Доступные команды:",
    "",
    "/start - начать работу",
    "/help - показать помощь",
    "/status - проверить Worker и базу D1",
    "",
    "Сбор материалов, темы и генерация черновиков будут добавлены следующим этапом."
  ].join("\n");
}

export async function buildStatusMessage(env: Env): Promise<string> {
  const d1 = await checkD1(env.DB);
  const repos = createRepositories(env.DB);
  const latestRun = await repos.processingRuns.latest();

  const latestRunText = latestRun
    ? `${latestRun.status}, ${latestRun.started_at}`
    : "запусков пока нет";

  return [
    "Статус Content Agent:",
    "",
    `Worker: доступен`,
    `D1: ${d1.available ? "доступна" : "недоступна"}`,
    `Последний cron run: ${latestRunText}`
  ].join("\n");
}

export function getCommand(text: string | undefined): string {
  if (!text) {
    return "";
  }

  return text.trim().split(/\s+/)[0]?.split("@")[0]?.toLowerCase() ?? "";
}

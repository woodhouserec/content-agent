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
    "/status - статус Worker и D1",
    "/collect - запустить сбор материалов"
  ].join("\n");
}

export async function buildHelpMessage(): Promise<string> {
  return [
    "Доступные команды:",
    "",
    "/start - начать работу",
    "/help - показать помощь",
    "/status - проверить Worker и базу D1",
    "/collect - вручную запустить сбор материалов",
    "",
    "На этом этапе бот собирает материалы из RSS/Atom и разрешённых Reddit-источников. Генерации постов пока нет."
  ].join("\n");
}

export async function buildStatusMessage(env: Env): Promise<string> {
  const d1 = await checkD1(env.DB);
  const repos = createRepositories(env.DB);
  const latestRun = await repos.processingRuns.latest();

  const latestRunText = latestRun
    ? `${latestRun.status}, ${latestRun.started_at}`
    : "запусков пока нет";
  const sourceErrors = latestRun?.failed_sources_count ?? 0;
  const totalItems = await repos.collectedItems.count();
  const failureText = latestRun?.status === "failed" && latestRun.error_message
    ? [`Ошибка: ${latestRun.error_message.slice(0, 180)}`]
    : [];

  return [
    "Статус Content Agent:",
    "",
    `Worker: доступен`,
    `D1: ${d1.available ? "доступна" : "недоступна"}`,
    `Последний запуск: ${latestRunText}`,
    `Новые материалы: ${latestRun?.new_items_count ?? 0}`,
    `Дубли: ${latestRun?.duplicate_items_count ?? 0}`,
    `Ошибки источников: ${sourceErrors}`,
    `Всего материалов: ${totalItems}`,
    ...failureText
  ].join("\n");
}

export function getCommand(text: string | undefined): string {
  if (!text) {
    return "";
  }

  return text.trim().split(/\s+/)[0]?.split("@")[0]?.toLowerCase() ?? "";
}

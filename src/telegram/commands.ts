import { checkD1 } from "../storage/db";
import { createRepositories } from "../storage/repositories";
import type { Env } from "../domain/runtime";
import { buildActiveProfileSummary } from "../scoring/relevance-profile";

export async function buildStartMessage(): Promise<string> {
  return [
    "Content Agent запущен.",
    "",
    "Я буду помогать выбирать темы и готовить черновики LinkedIn-постов.",
    "Теперь можно работать через кнопки меню: источники, темы, черновики и системные действия.",
    "",
    "Команды:",
    "/help - помощь",
    "/status - статус Worker и D1",
    "/collect - запустить сбор материалов",
    "/score - оценить материалы и создать темы",
    "/topics - показать темы",
    "/profile - показать relevance profile",
    "/usage - показать AI usage",
    "/sources - показать источники",
    "/addsource URL - проверить и добавить RSS/Atom",
    "/source_disable SOURCE_ID - отключить источник",
    "/source_test SOURCE_ID - проверить один источник",
    "/addurl URL - добавить разовый материал"
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
    "/score - оценить новые материалы и сформировать темы",
    "/topics - показать последние доступные темы",
    "/profile - показать relevance profile",
    "/usage - показать AI-вызовы, черновики, редакции и токены за месяц",
    "/sources - список источников",
    "/addsource URL - безопасно проверить RSS/Atom перед добавлением",
    "/source_disable SOURCE_ID - отключить источник без удаления",
    "/source_test SOURCE_ID - тестовый запуск одного RSS/Atom источника",
    "/addurl URL - извлечь preview статьи и добавить после подтверждения",
    "",
    "На этом этапе бот собирает материалы, оценивает темы и создаёт текстовые черновики только после выбора темы."
  ].join("\n");
}

export async function buildProfileMessage(env: Env): Promise<string> {
  return ["Relevance profile:", "", await buildActiveProfileSummary(env)].join("\n");
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

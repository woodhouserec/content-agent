import type { ReplyKeyboardMarkup } from "./types";

export const menuLabels = {
  main: "Главное меню",
  materials: "Материалы",
  topics: "Темы",
  drafts: "Черновики",
  system: "Система",
  collect: "Собрать материалы",
  sources: "Источники",
  addUrl: "Добавить URL",
  showTopics: "Показать темы",
  score: "Scoring",
  profile: "Профиль",
  usage: "Usage",
  status: "Статус",
  help: "Помощь",
  back: "Назад"
} as const;

export type MenuScreen = "main" | "materials" | "topics" | "drafts" | "system";

export interface MenuAction {
  kind: "screen" | "command" | "instruction";
  value: string;
}

export function buildMainMenu(): ReplyKeyboardMarkup {
  return keyboard([
    [menuLabels.materials, menuLabels.topics],
    [menuLabels.drafts, menuLabels.system]
  ], "Выберите раздел");
}

export function buildSectionMenu(screen: MenuScreen): ReplyKeyboardMarkup {
  if (screen === "materials") {
    return keyboard([
      [menuLabels.collect, menuLabels.sources],
      [menuLabels.addUrl],
      [menuLabels.back]
    ], "Материалы");
  }

  if (screen === "topics") {
    return keyboard([
      [menuLabels.showTopics, menuLabels.score],
      [menuLabels.profile],
      [menuLabels.back]
    ], "Темы");
  }

  if (screen === "drafts") {
    return keyboard([
      [menuLabels.usage],
      [menuLabels.back]
    ], "Черновики");
  }

  if (screen === "system") {
    return keyboard([
      [menuLabels.status, menuLabels.help],
      [menuLabels.back]
    ], "Система");
  }

  return buildMainMenu();
}

export function resolveMenuAction(text: string | undefined): MenuAction | null {
  const normalized = text?.trim();

  if (!normalized) {
    return null;
  }

  const screenMap: Record<string, MenuScreen> = {
    [menuLabels.main]: "main",
    [menuLabels.materials]: "materials",
    [menuLabels.topics]: "topics",
    [menuLabels.drafts]: "drafts",
    [menuLabels.system]: "system",
    [menuLabels.back]: "main"
  };

  if (screenMap[normalized]) {
    return { kind: "screen", value: screenMap[normalized] };
  }

  const commandMap: Record<string, string> = {
    [menuLabels.collect]: "/collect",
    [menuLabels.sources]: "/sources",
    [menuLabels.showTopics]: "/topics",
    [menuLabels.score]: "/score",
    [menuLabels.profile]: "/profile",
    [menuLabels.usage]: "/usage",
    [menuLabels.status]: "/status",
    [menuLabels.help]: "/help"
  };

  if (commandMap[normalized]) {
    return { kind: "command", value: commandMap[normalized] };
  }

  if (normalized === menuLabels.addUrl) {
    return { kind: "instruction", value: "Отправьте ссылку в формате:\n\n/addurl https://example.com/article" };
  }

  return null;
}

export function buildMenuMessage(screen: MenuScreen): string {
  if (screen === "main") {
    return "Главное меню Content Agent.";
  }

  if (screen === "materials") {
    return "Раздел материалов: сбор, источники и ручное добавление статей.";
  }

  if (screen === "topics") {
    return "Раздел тем: scoring, список тем и профиль релевантности.";
  }

  if (screen === "drafts") {
    return "Раздел черновиков: usage и действия с черновиками через кнопки под конкретным draft.";
  }

  return "Системный раздел: статус и помощь.";
}

export const botCommands = [
  { command: "start", description: "Открыть главное меню" },
  { command: "help", description: "Показать помощь" },
  { command: "status", description: "Проверить Worker и D1" },
  { command: "collect", description: "Собрать материалы" },
  { command: "score", description: "Оценить материалы и создать темы" },
  { command: "topics", description: "Показать доступные темы" },
  { command: "profile", description: "Показать relevance profile" },
  { command: "usage", description: "Показать AI usage" },
  { command: "sources", description: "Показать источники" },
  { command: "addurl", description: "Добавить разовый URL" }
];

function keyboard(rows: string[][], placeholder: string): ReplyKeyboardMarkup {
  return {
    keyboard: rows.map((row) => row.map((text) => ({ text }))),
    resize_keyboard: true,
    input_field_placeholder: placeholder
  };
}


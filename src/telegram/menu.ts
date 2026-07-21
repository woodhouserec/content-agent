import type { ReplyKeyboardMarkup } from "./types";

export const menuLabels = {
  main: "Главное меню",
  sourcesRoot: "Источники",
  temporarySources: "Временные источники",
  permanentSources: "Постоянные источники",
  topics: "Темы",
  drafts: "Черновики",
  system: "Система",
  collect: "Собрать материалы",
  showSources: "Показать источники",
  addUrlSource: "Добавить URL источника",
  editList: "Редактировать список",
  change: "Изменить",
  delete: "Удалить",
  next: "Далее",
  startOver: "Начать сначала",
  saveList: "Сохранить список",
  exit: "Выйти",
  yes: "Да",
  no: "Нет",
  showTopics: "Показать темы",
  score: "Scoring",
  profile: "Профиль",
  currentProfile: "Текущий профиль",
  myProfiles: "Мои профили",
  createProfile: "Создать новый",
  editProfile: "Изменить профиль",
  deleteProfile: "Удалить профиль",
  saveProfile: "Сохранить",
  usage: "Usage",
  status: "Статус",
  help: "Помощь",
  back: "Назад"
} as const;

export type MenuScreen =
  | "main"
  | "sourcesRoot"
  | "temporarySources"
  | "permanentSources"
  | "sourceList"
  | "sourceEditor"
  | "topics"
  | "profileRoot"
  | "myProfiles"
  | "profileWizard"
  | "drafts"
  | "system";

export interface MenuAction {
  kind: "screen" | "command" | "instruction";
  value: string;
}

export function buildMainMenu(): ReplyKeyboardMarkup {
  return keyboard([
    [menuLabels.sourcesRoot, menuLabels.topics],
    [menuLabels.drafts, menuLabels.system]
  ], "Выберите раздел");
}

export function buildSectionMenu(screen: MenuScreen): ReplyKeyboardMarkup {
  if (screen === "sourcesRoot") {
    return keyboard([
      [menuLabels.temporarySources, menuLabels.permanentSources],
      [menuLabels.back]
    ], "Источники");
  }

  if (screen === "temporarySources" || screen === "permanentSources") {
    return keyboard([
      [menuLabels.collect],
      [menuLabels.addUrlSource, menuLabels.showSources],
      [menuLabels.score, menuLabels.showTopics],
      [menuLabels.back]
    ], screen === "temporarySources" ? "Временные источники" : "Постоянные источники");
  }

  if (screen === "sourceList") {
    return keyboard([
      [menuLabels.editList],
      [menuLabels.back]
    ], "Список источников");
  }

  if (screen === "sourceEditor") {
    return keyboard([
      [menuLabels.change, menuLabels.delete],
      [menuLabels.back, menuLabels.next],
      [menuLabels.saveList, menuLabels.exit]
    ], "Редактирование источников");
  }

  if (screen === "topics") {
    return keyboard([
      [menuLabels.profile],
      [menuLabels.back]
    ], "Темы");
  }

  if (screen === "profileRoot") {
    return keyboard([
      [menuLabels.currentProfile, menuLabels.myProfiles],
      [menuLabels.back]
    ], "Профиль");
  }

  if (screen === "myProfiles") {
    return keyboard([
      [menuLabels.createProfile],
      [menuLabels.back]
    ], "Мои профили");
  }

  if (screen === "profileWizard") {
    return keyboard([
      [menuLabels.back, menuLabels.next],
      [menuLabels.exit]
    ], "Редактор профиля");
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
    [menuLabels.sourcesRoot]: "sourcesRoot",
    [menuLabels.temporarySources]: "temporarySources",
    [menuLabels.permanentSources]: "permanentSources",
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
    [menuLabels.showTopics]: "/topics",
    [menuLabels.score]: "/score",
    [menuLabels.currentProfile]: "/profile",
    [menuLabels.usage]: "/usage",
    [menuLabels.status]: "/status",
    [menuLabels.help]: "/help"
  };

  if (commandMap[normalized]) {
    return { kind: "command", value: commandMap[normalized] };
  }

  if (normalized === menuLabels.profile) {
    return { kind: "screen", value: "profileRoot" };
  }

  if (normalized === menuLabels.myProfiles) {
    return { kind: "screen", value: "myProfiles" };
  }

  if (normalized === menuLabels.addUrlSource) {
    return { kind: "instruction", value: "add_url_source" };
  }

  if (normalized === menuLabels.showSources) {
    return { kind: "instruction", value: "show_sources" };
  }

  if (normalized === menuLabels.editList) {
    return { kind: "instruction", value: "edit_sources" };
  }

  if (normalized === menuLabels.createProfile) {
    return { kind: "instruction", value: "create_profile" };
  }

  return null;
}

export function buildMenuMessage(screen: MenuScreen): string {
  if (screen === "main") {
    return "Главное меню Content Agent.";
  }

  if (screen === "sourcesRoot") {
    return "Раздел источников. Выберите временные или постоянные источники.";
  }

  if (screen === "temporarySources") {
    return "Временные источники: разовые URL-материалы для анализа и постов.";
  }

  if (screen === "permanentSources") {
    return "Постоянные источники: RSS/Atom/Reddit, которые собираются автоматически.";
  }

  if (screen === "sourceList") {
    return "Список источников.";
  }

  if (screen === "topics") {
    return "Раздел тем: scoring, список тем и профиль релевантности.";
  }

  if (screen === "profileRoot") {
    return "Профиль релевантности.";
  }

  if (screen === "myProfiles") {
    return "Мои профили. Выберите профиль или создайте новый.";
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

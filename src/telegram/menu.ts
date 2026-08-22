import type { ReplyKeyboardMarkup } from "./types";

export const menuLabels = {
  main: "Главное меню",
  sourcesRoot: "Источники",
  temporarySources: "Временные источники",
  permanentSources: "Постоянные источники",
  topics: "Профиль",
  system: "Система",
  collect: "Собрать материалы",
  resetMaterials: "Сброс материалов",
  showSources: "Показать источники",
  addUrlSource: "Добавить источник",
  editList: "Редактировать список",
  change: "Изменить",
  delete: "Удалить",
  enable: "Включить",
  disable: "Выключить",
  next: "Далее",
  startOver: "Начать сначала",
  saveList: "Сохранить список",
  exit: "Выйти",
  yes: "Да",
  no: "Нет",
  showTopics: "Показать тезисы",
  score: "Сгенерировать тезисы",
  resetTopics: "Сбросить тезисы",
  materialFilter: "Фильтр материалов",
  thesisFilter: "Фильтр тезисов",
  freshness7Days: "До 7 дней",
  freshness5Days: "До 5 дней",
  freshness3Days: "До 3 дней",
  freshness1Day: "До 1 суток",
  softerFilter: "Мягче фильтр",
  stricterFilter: "Строже фильтр",
  changeRuleScore: "Изменить Rule Score",
  changeTopicScore: "Изменить Topic Score",
  fewerTheses: "Меньше тезисов",
  moreTheses: "Больше тезисов",
  profile: "Профиль",
  currentProfile: "Текущий профиль",
  myProfiles: "Мои профили",
  createProfile: "Создать новый",
  editProfile: "Изменить профиль",
  deleteProfile: "Удалить профиль",
  saveProfile: "Сохранить",
  usage: "Usage",
  connectLinkedIn: "Подключить LinkedIn",
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
  | "materialFilter"
  | "thesisFilter"
  | "profileRoot"
  | "myProfiles"
  | "profileWizard"
  | "system";

export interface MenuAction {
  kind: "screen" | "command" | "instruction";
  value: string;
}

export function buildMainMenu(): ReplyKeyboardMarkup {
  return keyboard([
    [menuLabels.sourcesRoot, menuLabels.topics],
    [menuLabels.system]
  ], "Выберите раздел");
}

export function buildSectionMenu(screen: MenuScreen): ReplyKeyboardMarkup {
  if (screen === "sourcesRoot") {
    return keyboard([
      [menuLabels.temporarySources, menuLabels.permanentSources],
      [menuLabels.back]
    ], "Источники");
  }

  if (screen === "temporarySources") {
    return keyboard([
      [menuLabels.addUrlSource, menuLabels.showSources],
      [menuLabels.back]
    ], "Временные источники");
  }

  if (screen === "permanentSources") {
    return keyboard([
      [menuLabels.collect, menuLabels.resetMaterials],
      [menuLabels.score, menuLabels.resetTopics],
      [menuLabels.showSources, menuLabels.addUrlSource],
      [menuLabels.materialFilter, menuLabels.thesisFilter],
      [menuLabels.back]
    ], "Постоянные источники");
  }

  if (screen === "materialFilter") {
    return keyboard([
      [menuLabels.freshness7Days, menuLabels.freshness5Days],
      [menuLabels.freshness3Days, menuLabels.freshness1Day],
      [menuLabels.back]
    ], "Фильтр материалов");
  }

  if (screen === "thesisFilter") {
    return keyboard([
      [menuLabels.softerFilter, menuLabels.stricterFilter],
      [menuLabels.fewerTheses, menuLabels.moreTheses],
      [menuLabels.changeRuleScore],
      [menuLabels.changeTopicScore],
      [menuLabels.back]
    ], "Фильтр тезисов");
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

  if (screen === "system") {
    return keyboard([
      [menuLabels.status, menuLabels.usage],
      [menuLabels.connectLinkedIn],
      [menuLabels.help],
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
    [menuLabels.topics]: "profileRoot",
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

  if (normalized === menuLabels.resetTopics) {
    return { kind: "instruction", value: "reset_topics" };
  }

  if (normalized === menuLabels.resetMaterials) {
    return { kind: "instruction", value: "reset_materials" };
  }

  if (normalized === menuLabels.materialFilter) {
    return { kind: "instruction", value: "show_material_filter" };
  }

  if (normalized === menuLabels.freshness7Days) {
    return { kind: "instruction", value: "material_filter_7" };
  }

  if (normalized === menuLabels.freshness5Days) {
    return { kind: "instruction", value: "material_filter_5" };
  }

  if (normalized === menuLabels.freshness3Days) {
    return { kind: "instruction", value: "material_filter_3" };
  }

  if (normalized === menuLabels.freshness1Day) {
    return { kind: "instruction", value: "material_filter_1" };
  }

  if (normalized === menuLabels.thesisFilter) {
    return { kind: "instruction", value: "show_thesis_filter" };
  }

  if (normalized === menuLabels.softerFilter) {
    return { kind: "instruction", value: "soften_thesis_filter" };
  }

  if (normalized === menuLabels.stricterFilter) {
    return { kind: "instruction", value: "tighten_thesis_filter" };
  }

  if (normalized === menuLabels.changeRuleScore) {
    return { kind: "instruction", value: "change_rule_score" };
  }

  if (normalized === menuLabels.changeTopicScore) {
    return { kind: "instruction", value: "change_topic_score" };
  }

  if (normalized === menuLabels.fewerTheses) {
    return { kind: "instruction", value: "decrease_thesis_limit" };
  }

  if (normalized === menuLabels.moreTheses) {
    return { kind: "instruction", value: "increase_thesis_limit" };
  }

  if (normalized === menuLabels.connectLinkedIn) {
    return { kind: "instruction", value: "connect_linkedin" };
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
    return "Постоянные источники: RSS/Atom/Reddit или страницы-рубрики со статьями, которые собираются автоматически.";
  }

  if (screen === "thesisFilter") {
    return "Фильтр отбора материалов в тезисы.";
  }

  if (screen === "materialFilter") {
    return "Фильтр свежести материалов для постоянных источников.";
  }

  if (screen === "sourceList") {
    return "Список источников.";
  }

  if (screen === "profileRoot") {
    return "Профиль релевантности.";
  }

  if (screen === "myProfiles") {
    return "Мои профили. Выберите профиль или создайте новый.";
  }

  return "Системный раздел: статус, usage и помощь.";
}

export const botCommands = [
  { command: "start", description: "Открыть главное меню" },
  { command: "help", description: "Показать помощь" },
  { command: "status", description: "Проверить Worker и D1" },
  { command: "collect", description: "Собрать материалы" },
  { command: "score", description: "Сгенерировать тезисы" },
  { command: "topics", description: "Показать доступные тезисы" },
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

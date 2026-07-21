import type { Env } from "../domain/runtime";
import { createRepositories } from "../storage/repositories";
import type { RelevanceProfileInput, RelevanceProfileRecord } from "../storage/relevance-profiles";
import { formatStoredProfile, buildActiveProfileSummary } from "../scoring/relevance-profile";
import type { TelegramClient } from "./client";
import { buildSectionMenu, menuLabels } from "./menu";

const profileSteps = [
  { key: "name", label: "Profile Name" },
  { key: "role", label: "Role" },
  { key: "focus", label: "Focus" },
  { key: "audience", label: "Audience" },
  { key: "tone", label: "Tone" },
  { key: "position", label: "Position" },
  { key: "minRuleScore", label: "Min Rule Score" },
  { key: "minFinalScoreForTopic", label: "Min Final score for topic" }
] as const;

type ProfileStepKey = typeof profileSteps[number]["key"];

interface ProfileWizardPayload {
  mode: "create" | "edit";
  profileId: string | null;
  step: number;
  values: Partial<Record<ProfileStepKey, string>>;
}

export async function showCurrentProfile(env: Env, telegram: TelegramClient, chatId: string): Promise<void> {
  await telegram.sendMessage(chatId, ["Relevance profile:", "", await buildActiveProfileSummary(env)].join("\n"), {
    replyMarkup: buildSectionMenu("profileRoot")
  });
}

export async function showMyProfiles(env: Env, telegram: TelegramClient, chatId: string): Promise<void> {
  const profiles = await createRepositories(env.DB).relevanceProfiles.listActive();
  const profileButtons = profiles.map((profile) => [{ text: profile.name }]);

  await telegram.sendMessage(chatId, "Мои профили. Активный профиль отмечен в списке.", {
    replyMarkup: {
      keyboard: [
        ...profileButtons,
        [{ text: menuLabels.createProfile }],
        [{ text: menuLabels.back }]
      ],
      resize_keyboard: true,
      input_field_placeholder: "Выберите профиль"
    }
  });

  if (profiles.length > 0) {
    await telegram.sendMessage(chatId, profiles.map((profile) => `${profile.is_active ? "ACTIVE" : "saved"} ${profile.name}`).join("\n"));
  }
}

export async function startCreateProfile(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string): Promise<void> {
  await saveWizard(env, telegramUserId, chatId, {
    mode: "create",
    profileId: null,
    step: 0,
    values: {}
  });
  await sendCurrentStep(telegram, chatId, emptyPayload("create", null));
}

export async function handleProfileMessage(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, text: string): Promise<boolean> {
  const repos = createRepositories(env.DB);
  const wizard = await repos.conversationStates.getActive(telegramUserId, "profile_wizard");

  if (wizard) {
    await handleWizardInput(env, telegram, chatId, telegramUserId, parseWizard(wizard.payload_json), text);
    return true;
  }

  const selected = await repos.conversationStates.getActive(telegramUserId, "selected_profile");
  if (selected) {
    if (text.trim() === menuLabels.editProfile) {
      const profile = await repos.relevanceProfiles.getById(selected.target_id);
      if (!profile) {
        await telegram.sendMessage(chatId, "Профиль не найден.", { replyMarkup: buildSectionMenu("myProfiles") });
        return true;
      }
      await saveWizard(env, telegramUserId, chatId, profileToWizard(profile));
      await sendCurrentStep(telegram, chatId, profileToWizard(profile));
      return true;
    }

    if (text.trim() === menuLabels.deleteProfile) {
      const deleted = await repos.relevanceProfiles.softDelete(selected.target_id);
      await repos.conversationStates.clear(telegramUserId, "selected_profile");
      await telegram.sendMessage(chatId, deleted ? "Профиль удалён." : "Активный профиль нельзя удалить. Сначала активируйте другой профиль.", {
        replyMarkup: buildSectionMenu("myProfiles")
      });
      return true;
    }
  }

  const profiles = await repos.relevanceProfiles.listActive();
  const profile = profiles.find((candidate) => candidate.name === text.trim());

  if (profile) {
    await repos.conversationStates.set({
      telegramUserId,
      telegramChatId: chatId,
      stateType: "selected_profile",
      targetType: "relevance_profile",
      targetId: profile.id,
      ttlMinutes: 60
    });
    await repos.relevanceProfiles.activate(profile.id);
    await telegram.sendMessage(chatId, [`Профиль выбран и активирован: ${profile.name}`, "", formatStoredProfile({ ...profile, is_active: 1 })].join("\n"), {
      replyMarkup: {
        keyboard: [
          [{ text: menuLabels.editProfile }, { text: menuLabels.deleteProfile }],
          [{ text: menuLabels.back }]
        ],
        resize_keyboard: true
      }
    });
    return true;
  }

  return false;
}

async function handleWizardInput(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, payload: ProfileWizardPayload, text: string): Promise<void> {
  const trimmed = text.trim();

  if (trimmed === menuLabels.exit) {
    await createRepositories(env.DB).conversationStates.clear(telegramUserId, "profile_wizard");
    await telegram.sendMessage(chatId, "Редактор профиля закрыт.", { replyMarkup: buildSectionMenu("myProfiles") });
    return;
  }

  if (trimmed === menuLabels.back) {
    const previous = { ...payload, step: Math.max(0, payload.step - 1) };
    await saveWizard(env, telegramUserId, chatId, previous);
    await sendCurrentStep(telegram, chatId, previous);
    return;
  }

  if (trimmed === menuLabels.saveProfile && payload.step >= profileSteps.length) {
    await saveProfile(env, telegram, chatId, telegramUserId, payload);
    return;
  }

  if (trimmed === menuLabels.next) {
    const key = profileSteps[payload.step]?.key;
    if (key && !payload.values[key]) {
      await telegram.sendMessage(chatId, "Сначала отправьте значение для текущего блока. Пустой ввод не принимается.");
      return;
    }
    const next = { ...payload, step: Math.min(profileSteps.length, payload.step + 1) };
    await saveWizard(env, telegramUserId, chatId, next);
    await sendCurrentStep(telegram, chatId, next);
    return;
  }

  const step = profileSteps[payload.step];
  if (!step) {
    await telegram.sendMessage(chatId, "Проверьте данные и нажмите «Сохранить».", { replyMarkup: saveKeyboard() });
    return;
  }

  if (!trimmed) {
    await telegram.sendMessage(chatId, "Пустое значение не подходит. Отправьте текст для текущего блока.");
    return;
  }

  const updated = {
    ...payload,
    step: payload.step + 1,
    values: {
      ...payload.values,
      [step.key]: trimmed
    }
  };
  await saveWizard(env, telegramUserId, chatId, updated);
  await sendCurrentStep(telegram, chatId, updated);
}

async function sendCurrentStep(telegram: TelegramClient, chatId: string, payload: ProfileWizardPayload): Promise<void> {
  const step = profileSteps[payload.step];

  if (!step) {
    await telegram.sendMessage(chatId, ["Проверьте профиль перед сохранением:", "", formatWizardPreview(payload)].join("\n"), {
      replyMarkup: saveKeyboard()
    });
    return;
  }

  await telegram.sendMessage(chatId, `Введите ${step.label}:`, {
    replyMarkup: buildSectionMenu("profileWizard")
  });
}

async function saveProfile(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, payload: ProfileWizardPayload): Promise<void> {
  const input = wizardToInput(payload);
  const repos = createRepositories(env.DB);
  const profile = payload.mode === "edit" && payload.profileId
    ? await repos.relevanceProfiles.update(payload.profileId, input)
    : await repos.relevanceProfiles.create(input, true);

  if (payload.mode === "edit") {
    await repos.relevanceProfiles.activate(profile.id);
  }

  await repos.conversationStates.clear(telegramUserId, "profile_wizard");
  await telegram.sendMessage(chatId, [`Профиль сохранён и активирован: ${profile.name}`, "", formatStoredProfile({ ...profile, is_active: 1 })].join("\n"), {
    replyMarkup: buildSectionMenu("myProfiles")
  });
}

function wizardToInput(payload: ProfileWizardPayload): RelevanceProfileInput {
  const values = payload.values;
  return {
    name: required(values.name, "Profile Name"),
    role: required(values.role, "Role"),
    focus: splitList(required(values.focus, "Focus")),
    audience: splitList(required(values.audience, "Audience")),
    tone: required(values.tone, "Tone"),
    position: required(values.position, "Position"),
    minRuleScore: parseScore(required(values.minRuleScore, "Min Rule Score")),
    minFinalScoreForTopic: parseScore(required(values.minFinalScoreForTopic, "Min Final score for topic"))
  };
}

function profileToWizard(profile: RelevanceProfileRecord): ProfileWizardPayload {
  return {
    mode: "edit",
    profileId: profile.id,
    step: 0,
    values: {
      name: profile.name,
      role: profile.role,
      focus: JSON.parse(profile.focus_json).join(", "),
      audience: JSON.parse(profile.audience_json).join(", "),
      tone: profile.tone,
      position: profile.position,
      minRuleScore: String(profile.min_rule_score),
      minFinalScoreForTopic: String(profile.min_final_score_for_topic)
    }
  };
}

function emptyPayload(mode: "create" | "edit", profileId: string | null): ProfileWizardPayload {
  return { mode, profileId, step: 0, values: {} };
}

async function saveWizard(env: Env, telegramUserId: string, chatId: string, payload: ProfileWizardPayload): Promise<void> {
  await createRepositories(env.DB).conversationStates.set({
    telegramUserId,
    telegramChatId: chatId,
    stateType: "profile_wizard",
    targetType: "relevance_profile",
    targetId: payload.profileId ?? "new",
    payload,
    ttlMinutes: 120
  });
}

function parseWizard(value: string | null): ProfileWizardPayload {
  if (!value) {
    return emptyPayload("create", null);
  }

  try {
    const parsed = JSON.parse(value) as ProfileWizardPayload;
    return {
      mode: parsed.mode === "edit" ? "edit" : "create",
      profileId: typeof parsed.profileId === "string" ? parsed.profileId : null,
      step: typeof parsed.step === "number" ? parsed.step : 0,
      values: parsed.values ?? {}
    };
  } catch {
    return emptyPayload("create", null);
  }
}

function formatWizardPreview(payload: ProfileWizardPayload): string {
  const input = wizardToInput(payload);
  return [
    `Profile: ${input.name}`,
    `Role: ${input.role}`,
    `Focus: ${input.focus.join(", ")}`,
    `Audience: ${input.audience.join(", ")}`,
    `Tone: ${input.tone}`,
    `Position: ${input.position}`,
    `Min rule score for AI: ${input.minRuleScore}`,
    `Min final score for topic: ${input.minFinalScoreForTopic}`
  ].join("\n");
}

function saveKeyboard() {
  return {
    keyboard: [
      [{ text: menuLabels.saveProfile }],
      [{ text: menuLabels.back }, { text: menuLabels.exit }]
    ],
    resize_keyboard: true
  };
}

function splitList(value: string): string[] {
  return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
}

function required(value: string | undefined, label: string): string {
  if (!value?.trim()) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function parseScore(value: string): number {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error("Score must be a number from 0 to 100");
  }
  return Math.round(score);
}

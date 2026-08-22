import type { AiScoringResult } from "./openai";
import type { CollectedItemRecord } from "../storage/collected-items";
import { scoringConfig } from "./config";
import { createTopicFingerprint } from "./topic-fingerprint";

export interface TopicCandidate {
  title: string;
  titleRu: string;
  summary: string;
  summaryRu: string;
  whyItMatters: string;
  whyItMattersRu: string;
  suggestedAngle: string;
  suggestedAngleRu: string;
  targetAudience: string;
  sourceItemIds: string[];
  combinedScore: number;
  noveltyScore: number;
  aiReasoningSummary: string | null;
}

const topicMap = [
  {
    key: "ai_design",
    keywords: ["ai", "artificial intelligence", "automation", "llm", "agent", "agentic", "generative", "prompt"],
    title: "Where AI can support product design work without replacing product judgment",
    titleRu: "Где AI помогает продуктовому дизайну, но не заменяет профессиональное суждение",
    angle: "Use the sources to separate useful AI assistance from the human responsibility for framing, tradeoffs, and product outcomes.",
    angleRu: "Разобрать, где AI действительно помогает дизайнеру, а где ответственность за постановку задачи, компромиссы и продуктовый результат остаётся за человеком.",
    whyItMatters: "AI is becoming part of everyday design work, but teams still need clear judgment about what should be automated and what must remain a product decision.",
    whyItMattersRu: "AI становится частью ежедневной работы дизайнера, но командам всё ещё нужно понимать, что можно автоматизировать, а что должно оставаться продуктовым решением."
  },
  {
    key: "ai_interaction",
    keywords: ["ai ui", "ai-generated", "agentic tool", "chat interface", "assistant", "human-ai", "canvas", "workflow"],
    title: "Why AI products need interaction design, not just better model output",
    titleRu: "Почему AI-продуктам нужен interaction design, а не только более сильная модель",
    angle: "Frame AI as an interaction problem: trust, control, feedback, and error recovery matter as much as raw capability.",
    angleRu: "Показать AI как UX-задачу: доверие, контроль, обратная связь и восстановление после ошибок важны не меньше, чем качество ответа модели.",
    whyItMatters: "As AI becomes a product surface, UX quality depends on how well people can understand, steer, and recover from system behavior.",
    whyItMattersRu: "Когда AI становится частью интерфейса, качество продукта зависит от того, насколько пользователь понимает систему, управляет ей и исправляет ошибки."
  },
  {
    key: "design_systems_governance",
    keywords: ["design system", "component", "tokens", "variables", "governance", "library", "figma", "pattern"],
    title: "Why design systems now need governance as much as components",
    titleRu: "Почему дизайн-системам нужна не только библиотека компонентов, но и управление",
    angle: "Discuss how design systems affect consistency, accessibility, product velocity, and decision-making across teams.",
    angleRu: "Связать дизайн-системы с консистентностью, доступностью, скоростью продуктовой работы и качеством решений в командах.",
    whyItMatters: "Design systems create value only when they shape real product decisions, not when they become a disconnected UI inventory.",
    whyItMattersRu: "Дизайн-система создаёт ценность только тогда, когда влияет на реальные продуктовые решения, а не живёт как отдельный UI-склад."
  },
  {
    key: "ux_research_outcomes",
    keywords: ["research", "usability", "user research", "interview", "insight", "study", "survey", "testing", "outcome"],
    title: "Why stronger UX research is less about more data and more about better product decisions",
    titleRu: "Почему сильный UX research — это не больше данных, а лучшие продуктовые решения",
    angle: "Frame research as a decision-quality practice for teams, not a ritual or report factory.",
    angleRu: "Показать research как практику повышения качества решений, а не как ритуал интервью и отчётов.",
    whyItMatters: "Research becomes more valuable when it changes product direction, prioritization, and risk management.",
    whyItMattersRu: "Исследования становятся ценными, когда меняют направление продукта, приоритеты и понимание рисков."
  },
  {
    key: "ux_metrics",
    keywords: ["metric", "outcome", "benchmark", "measurement", "analytics", "conversion", "retention", "task completion", "sus", "nps"],
    title: "How designers can report product outcomes instead of design activity",
    titleRu: "Как дизайнерам говорить о продуктовых результатах, а не только о дизайн-активности",
    angle: "Connect UX metrics to business decisions without reducing design quality to vanity numbers.",
    angleRu: "Связать UX-метрики с бизнес-решениями, не превращая качество дизайна в набор vanity metrics.",
    whyItMatters: "Design teams earn more influence when they can explain how their work affects risk, revenue, speed, retention, or customer effort.",
    whyItMattersRu: "Дизайн-команды получают больше влияния, когда могут объяснить, как их работа влияет на риск, выручку, скорость, удержание или усилие пользователя."
  },
  {
    key: "accessibility",
    keywords: ["accessibility", "inclusive", "wcag", "a11y", "assistive", "semantic", "keyboard", "screen reader"],
    title: "Why accessibility should be treated as product quality, not a late-stage checklist",
    titleRu: "Почему accessibility — это качество продукта, а не чеклист перед релизом",
    angle: "Connect accessibility to usability, market reach, risk reduction, and product craft.",
    angleRu: "Связать accessibility с удобством, охватом аудитории, снижением рисков и зрелостью продуктовой работы.",
    whyItMatters: "Accessibility decisions shape whether a product works for real people in real conditions, not only whether it passes a compliance review.",
    whyItMattersRu: "Accessibility-решения определяют, работает ли продукт для реальных людей в реальных условиях, а не только проходит ли он формальную проверку."
  },
  {
    key: "forms_usability",
    keywords: ["form", "forms", "input", "checkout", "signup", "onboarding", "field", "validation", "friction"],
    title: "Why small form decisions can create outsized product friction",
    titleRu: "Почему маленькие решения в формах создают большую продуктовую фрикцию",
    angle: "Use the source as a practical reflection on how UI details affect completion, trust, and customer effort.",
    angleRu: "Разобрать, как детали интерфейса в формах влияют на завершение сценария, доверие и усилие пользователя.",
    whyItMatters: "Forms are often where product intent meets user patience, so small interaction choices can directly affect conversion and satisfaction.",
    whyItMattersRu: "Формы часто становятся местом, где продуктовая логика сталкивается с терпением пользователя, поэтому мелкие UX-решения могут сильно влиять на конверсию и удовлетворённость."
  },
  {
    key: "product_discovery",
    keywords: ["discovery", "prototype", "experiment", "problem", "opportunity", "validation", "hypothesis", "customer evidence"],
    title: "Why product discovery should protect teams from building polished guesses",
    titleRu: "Почему product discovery должен защищать команды от красивых, но непроверенных догадок",
    angle: "Show how designers can use evidence, prototypes, and constraints to improve product bets before execution.",
    angleRu: "Показать, как дизайнеры используют evidence, прототипы и ограничения, чтобы улучшать продуктовые ставки до полноценной разработки.",
    whyItMatters: "Discovery work matters when it reduces uncertainty and helps teams choose what not to build.",
    whyItMattersRu: "Discovery имеет смысл, когда снижает неопределённость и помогает команде понять, что не нужно строить."
  },
  {
    key: "product_strategy_saas",
    keywords: ["strategy", "saas", "pricing", "monetization", "roadmap", "positioning", "b2b", "enterprise", "growth"],
    title: "How product designers can bring stronger strategic judgment into SaaS decisions",
    titleRu: "Как продуктовые дизайнеры могут усиливать стратегические решения в SaaS",
    angle: "Show how designers can connect user evidence, business constraints, and product direction.",
    angleRu: "Показать, как дизайнер соединяет пользовательские данные, бизнес-ограничения и направление продукта.",
    whyItMatters: "SaaS teams need designers who can reason about customer value, business model, and long-term product quality together.",
    whyItMattersRu: "SaaS-командам нужны дизайнеры, которые умеют одновременно думать о ценности для клиента, бизнес-модели и долгосрочном качестве продукта."
  },
  {
    key: "startup_founder",
    keywords: ["startup", "founder", "fundraising", "seed", "venture", "vc", "early stage", "go-to-market"],
    title: "What startup builders can learn when product, design, and go-to-market signals collide",
    titleRu: "Что стартапам важно видеть на стыке продукта, дизайна и go-to-market",
    angle: "Turn startup material into a practitioner insight about focus, learning speed, and product responsibility.",
    angleRu: "Превратить стартап-материал в практический вывод о фокусе, скорости обучения и продуктовой ответственности.",
    whyItMatters: "Early teams often make design decisions under pressure, so the best content connects craft with market learning and execution.",
    whyItMattersRu: "Ранние команды часто принимают дизайн-решения под давлением, поэтому сильная тема должна связывать качество продукта с рынком и исполнением."
  },
  {
    key: "design_operations",
    keywords: ["design ops", "design operations", "process", "team", "handoff", "collaboration", "workflow", "leadership", "stakeholder"],
    title: "Why design operations should make better decisions easier, not add more process",
    titleRu: "Почему Design Ops должен упрощать хорошие решения, а не добавлять процесс ради процесса",
    angle: "Discuss process as an enabler of clarity, collaboration, and accountability rather than bureaucracy.",
    angleRu: "Показать процесс как инструмент ясности, совместной работы и ответственности, а не как бюрократию.",
    whyItMatters: "Design process is useful when it improves the quality and speed of decisions across product teams.",
    whyItMattersRu: "Процесс в дизайне полезен тогда, когда повышает качество и скорость решений в продуктовых командах."
  },
  {
    key: "product_strategy",
    keywords: ["product", "customer", "market", "decision", "value", "growth", "strategy"],
    title: "Why product design needs a clearer point of view on customer value",
    titleRu: "Почему продуктовому дизайну нужен более ясный взгляд на ценность для клиента",
    angle: "Use the sources to explain how designers can contribute beyond interface execution.",
    angleRu: "Показать, как дизайнер может быть полезен не только в интерфейсе, но и в понимании клиентской ценности.",
    whyItMatters: "Product designers become more valuable when they can connect interface choices to customer problems, team constraints, and business outcomes.",
    whyItMattersRu: "Продуктовые дизайнеры становятся сильнее, когда связывают интерфейсные решения с проблемами клиента, ограничениями команды и бизнес-результатами."
  }
];

export async function formTopics(
  items: CollectedItemRecord[],
  aiResults: AiScoringResult[],
  options: { minFinalScoreForTopic?: number } = {}
): Promise<Array<TopicCandidate & { fingerprint: string }>> {
  const aiByItemId = new Map(aiResults.map((result) => [result.itemId, result]));
  let eligible = items
    .filter((item) => (item.final_score ?? 0) >= (options.minFinalScoreForTopic ?? scoringConfig.minFinalScoreForTopic))
    .sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0));

  if (eligible.length === 0 && aiResults.length > 0) {
    eligible = items
      .filter((item) => {
        const ai = aiByItemId.get(item.id);
        return Boolean(ai && isUsefulAiMaterial(ai, item));
      })
      .sort((a, b) => aiMaterialScore(aiByItemId.get(b.id), b) - aiMaterialScore(aiByItemId.get(a.id), a))
      .slice(0, scoringConfig.maxTopicsPerRun);
  }

  if (eligible.length === 0 && items.length > 0) {
    eligible = items
      .filter((item) => (item.final_score ?? item.rule_score ?? 0) >= 35)
      .sort((a, b) => (b.final_score ?? b.rule_score ?? 0) - (a.final_score ?? a.rule_score ?? 0))
      .slice(0, Math.min(3, scoringConfig.maxTopicsPerRun));
  }

  const aiCandidates = await formAiPostIdeas(eligible, aiResults);
  if (aiCandidates.length > 0) {
    return aiCandidates.slice(0, scoringConfig.maxTopicsPerRun);
  }

  const candidates: Array<TopicCandidate & { fingerprint: string }> = [];

  for (const item of eligible.slice(0, scoringConfig.maxTopicsPerRun)) {
    const key = classifyItem(item);
    const template = topicMap.find((topic) => topic.key === key) ?? topicMap[topicMap.length - 1];
    const topItems = [item];
    const ai = topItems.map((item) => aiByItemId.get(item.id)).find(Boolean);
    const sourceItemIds = topItems.map((item) => item.id);
    const combinedScore = Math.round(topItems.reduce((sum, item) => sum + (item.final_score ?? 0), 0) / topItems.length);
    const noveltyScore = Math.round(topItems.reduce((sum, item) => sum + (extractNovelty(item, aiByItemId.get(item.id)) ?? 65), 0) / topItems.length);
    const title = ai?.possibleLinkedInAngle && isSpecificAiAngle(ai.possibleLinkedInAngle)
      ? ai.possibleLinkedInAngle
      : sourceBasedTitle(topItems);
    const titleRu = sourceBasedTitleRu(topItems, template.titleRu);
    const suggestedAngle = sourceBasedAngle(topItems, template.angle);
    const suggestedAngleRu = sourceBasedAngleRu(topItems, template.angleRu);
    const fingerprint = await createTopicFingerprint(title, suggestedAngle, sourceItemIds);

    candidates.push({
      title,
      titleRu,
      summary: sourceBasedAiSummary(topItems),
      summaryRu: sourceBasedAiSummaryRu(topItems),
      whyItMatters: sourceBasedRecruiterValue(topItems, ai) ?? sourceBasedValue(topItems, template.whyItMatters),
      whyItMattersRu: sourceBasedRecruiterValueRu(topItems, ai) ?? sourceBasedValueRu(topItems, template.whyItMattersRu),
      suggestedAngle,
      suggestedAngleRu,
      targetAudience: "Product Designers, Design Leads, Product Managers, Founders, SaaS teams",
      sourceItemIds,
      combinedScore,
      noveltyScore,
      aiReasoningSummary: ai?.explanation ?? null,
      fingerprint
    });
  }

  return candidates
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, scoringConfig.maxTopicsPerRun);
}

async function formAiPostIdeas(
  eligible: CollectedItemRecord[],
  aiResults: AiScoringResult[]
): Promise<Array<TopicCandidate & { fingerprint: string }>> {
  const itemsById = new Map(eligible.map((item) => [item.id, item]));
  const sorted = aiResults
    .filter((result) => itemsById.has(result.itemId))
    .sort((a, b) => (b.professionalValue + b.aiRelevanceScore) - (a.professionalValue + a.aiRelevanceScore));
  const candidates: Array<TopicCandidate & { fingerprint: string }> = [];

  for (const ai of sorted) {
    const item = itemsById.get(ai.itemId);
    if (!item) {
      continue;
    }

    const title = usableAiTitle(ai.postTitle) ?? usableAiTitle(ai.possibleLinkedInAngle) ?? sourceBasedTitle([item]);
    const titleRu = usableAiTitle(ai.postTitleRu) ?? sourceBasedTitleRu([item]);
    const suggestedAngle = usableAiField(ai.possibleLinkedInAngle) ?? sourceBasedAngle([item]);
    const suggestedAngleRu = ai.suggestedAngleRu;
    const summary = ai.shortDescription;
    const summaryRu = ai.shortDescriptionRu;
    const audienceValue = ai.audienceValue;
    const hrValue = usableAiMaterialField(ai.hrValue, item) ?? "Shows how the author thinks about product quality, design judgment, and business context through a concrete source.";
    const audienceValueRu = ai.audienceValueRu;
    const hrValueRu = usableAiMaterialField(ai.hrValueRu, item) ?? "Показывает профессиональное мышление автора через конкретный материал: продуктовый взгляд, дизайн-суждение и связь с бизнес-контекстом.";
    const recruiterValue = ai.recruiterValue;
    const recruiterValueRu = ai.recruiterValueRu;
    const sourceItemIds = [item.id];
    const combinedScore = Math.round(((item.final_score ?? item.rule_score ?? 70) * 0.35) + (ai.aiRelevanceScore * 0.35) + (ai.professionalValue * 0.3));
    const noveltyScore = ai.noveltyScore;
    const fingerprint = await createTopicFingerprint(title, suggestedAngle, sourceItemIds);

    candidates.push({
      title,
      titleRu,
      summary,
      summaryRu,
      whyItMatters: formatHiringValue(ai.keyThesis, audienceValue, recruiterValue ?? hrValue),
      whyItMattersRu: formatHiringValueRu(ai.keyThesisRu, audienceValueRu, recruiterValueRu ?? hrValueRu),
      suggestedAngle,
      suggestedAngleRu,
      targetAudience: "Product Designers, UI/UX Designers, Design Leads, Product Managers, Founders, HR",
      sourceItemIds,
      combinedScore,
      noveltyScore,
      aiReasoningSummary: ai.explanation,
      fingerprint
    });
  }

  return candidates;
}

export function classifyItem(item: CollectedItemRecord): string {
  const text = `${item.title} ${item.summary ?? ""} ${item.normalized_content ?? ""}`.toLowerCase();
  let best = { key: "product_strategy", score: 0 };

  for (const topic of topicMap) {
    const score = topic.keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? keywordWeight(keyword) : 0), 0);
    if (score > best.score) {
      best = { key: topic.key, score };
    }
  }

  return best.key;
}

function sourceBasedTitle(items: CollectedItemRecord[]): string {
  const primary = items[0];
  if (!primary) {
    return "A product design perspective on recent UX material";
  }

  return `A product design perspective on ${cleanTitle(primary.title)}`.slice(0, 220);
}

function sourceBasedTitleRu(items: CollectedItemRecord[], fallback = "Профессиональный взгляд на UX/Product материал"): string {
  const primary = items[0];
  if (!primary) {
    return fallback;
  }

  return `Профессиональный взгляд на материал: ${cleanTitle(primary.title)}`.slice(0, 220);
}

function sourceBasedAiSummary(items: CollectedItemRecord[]): string {
  const primary = items[0];
  if (!primary) {
    return "A concise post preview grounded in the selected Product/UX material.";
  }

  const signal = inferHiringSignal(primary);
  return withSourceDigest(signal.summaryEn(cleanTitle(primary.title)), primary);
}

function sourceBasedAiSummaryRu(items: CollectedItemRecord[]): string {
  const primary = items[0];
  if (!primary) {
    return "Короткое описание поста, основанное на выбранном Product/UX-материале.";
  }

  const signal = inferHiringSignal(primary);
  return withSourceDigest(signal.summaryRu(cleanTitle(primary.title)), primary);
}

function sourceBasedValue(items: CollectedItemRecord[], fallback = "This material can help a Product/UX audience connect interface decisions with product quality."): string {
  const primary = items[0];
  if (!primary) {
    return fallback;
  }

  return `This is useful for Product/UX readers because it turns a concrete material about "${cleanTitle(primary.title)}" into a discussion about product judgment, user effort, and design quality.`;
}

function sourceBasedValueRu(items: CollectedItemRecord[], fallback = "Материал помогает Product/UX-аудитории связать интерфейсные решения с качеством продукта."): string {
  const primary = items[0];
  if (!primary) {
    return fallback;
  }

  return `Это полезно Product/UX-аудитории, потому что материал "${cleanTitle(primary.title)}" можно превратить в разговор о продуктовых решениях, усилии пользователя и качестве дизайна.`;
}

function sourceBasedRecruiterValue(items: CollectedItemRecord[], ai?: AiScoringResult): string | null {
  const primary = items[0];
  if (!primary) {
    return null;
  }

  const thesis = usableAiField(ai?.keyThesis);
  const signal = inferHiringSignal(primary);
  const title = cleanTitle(primary.title);

  return thesis
    ? `Key thesis: ${thesis} Recruiter value: ${signal.enWithThesis(title)}`
    : `Recruiter value: ${signal.enFallback(title)}`;
}

function sourceBasedRecruiterValueRu(items: CollectedItemRecord[], ai?: AiScoringResult): string | null {
  const primary = items[0];
  if (!primary) {
    return null;
  }

  const thesis = usableAiField(ai?.keyThesisRu);
  const signal = inferHiringSignal(primary);
  const title = cleanTitle(primary.title);

  return thesis
    ? `Ключевой смысловой тезис: ${thesis} Ценность для рекрутера: ${signal.ruWithThesis(title)}`
    : `Ценность для рекрутера: ${signal.ruFallback(title)}`;
}

function formatHiringValue(keyThesis: string | undefined, audienceValue: string, recruiterValue: string): string {
  const thesis = usableAiField(keyThesis);
  return thesis
    ? `Key thesis: ${thesis} Audience value: ${audienceValue} Recruiter value: ${recruiterValue}`
    : `Audience value: ${audienceValue} Recruiter value: ${recruiterValue}`;
}

function formatHiringValueRu(keyThesis: string | undefined, audienceValue: string, recruiterValue: string): string {
  const thesis = usableAiField(keyThesis);
  return thesis
    ? `Ключевой смысловой тезис: ${thesis} Ценность для аудитории: ${audienceValue} Ценность для рекрутера: ${recruiterValue}`
    : `Ценность для аудитории: ${audienceValue} Ценность для рекрутера: ${recruiterValue}`;
}

interface HiringSignal {
  enWithThesis: (title: string) => string;
  enFallback: (title: string) => string;
  ruWithThesis: (title: string) => string;
  ruFallback: (title: string) => string;
  angleEn: (title: string) => string;
  angleRu: (title: string) => string;
  summaryEn: (title: string) => string;
  summaryRu: (title: string) => string;
}

function inferHiringSignal(item: CollectedItemRecord): HiringSignal {
  const text = `${item.title} ${item.summary ?? ""} ${item.normalized_content ?? ""}`.toLowerCase();
  const isServiceDiscovery = (
    text.includes("restaurant") ||
    text.includes("booking") ||
    text.includes("ecommerce") ||
    text.includes("commerce") ||
    text.includes("retail") ||
    text.includes("shopper") ||
    text.includes("service")
  ) && (
    text.includes("discovery") ||
    text.includes("app") ||
    text.includes("journey") ||
    text.includes("experience") ||
    text.includes("time") ||
    text.includes("intent")
  );

  if (text.includes("health insurance") || text.includes("insurance website") || text.includes("insurance portal") || (text.includes("nps") && text.includes("health"))) {
    return {
      enWithThesis: (title) => `it shows product judgment in high-stakes self-service: how clarity, confidence, and task completion shape healthcare insurance experiences in "${title}".`,
      enFallback: (title) => `For hiring, "${title}" can show that the author can reason about trust, comprehension, and self-service UX in a high-stakes insurance context.`,
      ruWithThesis: (title) => `он показывает продуктовое суждение в high-stakes self-service: как ясность, уверенность и завершение задач формируют опыт медицинского страхования в "${title}".`,
      ruFallback: (title) => `для hiring-аудитории "${title}" показывает умение рассуждать о доверии, понимании и self-service UX в чувствительном контексте медицинского страхования.`,
      angleEn: (title) => `Use "${title}" to discuss why health insurance portals need UX that builds confidence, reduces ambiguity, and helps people complete high-stakes tasks.`,
      angleRu: (title) => `Разобрать "${title}" через то, почему порталам медицинского страхования нужен UX, который создаёт уверенность, снижает неоднозначность и помогает завершать важные задачи.`,
      summaryEn: (title) => `A post about health-insurance UX: how "${title}" turns convenience, NPS, and online account control into questions of trust and task completion.`,
      summaryRu: (title) => `Пост о UX медицинского страхования: как "${title}" переводит удобство, NPS и управление аккаунтом в вопросы доверия и завершения пользовательских задач.`
    };
  }
  if (text.includes("women's health") || text.includes("diagnosis") || text.includes("bayesian") || text.includes("scan automation") || text.includes("clinical") || text.includes("fertility")) {
    return {
      enWithThesis: (title) => `it shows AI-product judgment in a sensitive healthcare context: how automation, diagnosis support, and human accountability need to work together in "${title}".`,
      enFallback: (title) => `A recruiter would see that the author can evaluate AI beyond novelty, using "${title}" to discuss reliability, responsibility, and workflow fit in healthcare.`,
      ruWithThesis: (title) => `он показывает AI-product judgment в чувствительном healthcare-контексте: как автоматизация, диагностическая поддержка и человеческая ответственность должны работать вместе в "${title}".`,
      ruFallback: (title) => `рекрутер увидит, что автор оценивает AI не как новинку, а через надёжность, ответственность и встраивание в healthcare workflow на примере "${title}".`,
      angleEn: (title) => `Use "${title}" to separate useful AI automation from the product responsibility required in clinical or diagnostic workflows.`,
      angleRu: (title) => `Разобрать "${title}" через границу между полезной AI-автоматизацией и продуктовой ответственностью в клинических или диагностических сценариях.`,
      summaryEn: (title) => `A post about AI in healthcare products: how "${title}" raises questions of diagnostic support, automation boundaries, and professional accountability.`,
      summaryRu: (title) => `Пост об AI в healthcare-продуктах: как "${title}" поднимает вопросы диагностической поддержки, границ автоматизации и профессиональной ответственности.`
    };
  }
  if (text.includes("ai") && (text.includes("interview") || text.includes("moderate") || text.includes("moderation") || text.includes("ux of ai") || text.includes("ai-generated"))) {
    return {
      enWithThesis: (title) => `it shows AI interaction judgment: how control, trust, and human oversight shape whether AI improves or weakens UX work in "${title}".`,
      enFallback: (title) => `For hiring, "${title}" can show that the author evaluates AI through workflow quality, user trust, and professional responsibility instead of model hype.`,
      ruWithThesis: (title) => `он показывает зрелое AI interaction-суждение: как контроль, доверие и human oversight определяют, усиливает ли AI UX-работу в "${title}".`,
      ruFallback: (title) => `для hiring-аудитории "${title}" показывает, что автор оценивает AI через качество workflow, доверие пользователя и профессиональную ответственность, а не через hype.`,
      angleEn: (title) => `Use "${title}" to discuss AI as an interaction and workflow problem, not only as model capability.`,
      angleRu: (title) => `Разобрать "${title}" как interaction и workflow-задачу, а не только как вопрос возможностей модели.`,
      summaryEn: (title) => `A post about AI UX: how "${title}" connects automation with trust, control, and the designer's responsibility for workflow quality.`,
      summaryRu: (title) => `Пост об AI UX: как "${title}" связывает автоматизацию с доверием, контролем и ответственностью дизайнера за качество workflow.`
    };
  }
  if (text.includes("betting") || text.includes("finance") || text.includes("trust") || text.includes("regulated")) {
    return {
      enWithThesis: (title) => `it signals judgment about trust-heavy products: how identity, clarity, and interaction choices shape confidence in a sensitive category like "${title}".`,
      enFallback: (title) => `For hiring, "${title}" can demonstrate that the author thinks beyond aesthetics and can reason about trust, risk perception, and clarity in complex product categories.`,
      ruWithThesis: (title) => `он сигнализирует зрелое мышление о trust-heavy продуктах: как identity, ясность и interaction-решения формируют доверие в чувствительной категории на примере "${title}".`,
      ruFallback: (title) => `для hiring-аудитории "${title}" может показать, что автор мыслит не только эстетикой, но и доверием, восприятием риска и ясностью в сложных продуктовых категориях.`,
      angleEn: (title) => `Use "${title}" to discuss how design choices create or reduce trust in categories where risk, clarity, and confidence matter.`,
      angleRu: (title) => `Разобрать "${title}" через доверие, восприятие риска и ясность решений в продуктовой категории, где ошибка особенно заметна пользователю.`,
      summaryEn: (title) => `A post about how "${title}" reveals the role of trust, clarity, and risk perception in product and brand decisions.`,
      summaryRu: (title) => `Пост о том, как "${title}" раскрывает роль доверия, ясности и восприятия риска в продуктовых и брендовых решениях.`
    };
  }
  if (text.includes("research") || text.includes("study") || text.includes("insight") || text.includes("survey") || text.includes("interview") || text.includes("evidence")) {
    return {
      enWithThesis: (title) => `it highlights research maturity: the ability to turn evidence from "${title}" into product decisions rather than simply reporting findings.`,
      enFallback: (title) => `Recruiters can read this as a signal of research maturity: "${title}" becomes a way to show how evidence informs prioritization, risk, and product judgment.`,
      ruWithThesis: (title) => `он подсвечивает исследовательскую зрелость: умение превращать evidence из "${title}" в продуктовые решения, а не просто пересказывать findings.`,
      ruFallback: (title) => `для рекрутера это сигнал исследовательской зрелости: "${title}" становится способом показать, как evidence влияет на приоритизацию, риски и продуктовые решения.`,
      angleEn: (title) => `Use "${title}" to show how research evidence should change decisions, prioritization, or risk thinking, not just fill a report.`,
      angleRu: (title) => `Разобрать "${title}" как пример того, как research evidence должен менять решения, приоритеты или понимание риска, а не просто пополнять отчёт.`,
      summaryEn: (title) => `A post about how "${title}" connects research evidence with better prioritization, risk judgment, and product decisions.`,
      summaryRu: (title) => `Пост о том, как "${title}" связывает research evidence с лучшей приоритизацией, оценкой рисков и продуктовыми решениями.`
    };
  }
  if (text.includes("tourism") || text.includes("destination") || text.includes("place") || text.includes("visit")) {
    return {
      enWithThesis: (title) => `it shows strategic experience thinking: the ability to translate perception, place, and motivation into a clearer product or brand experience through "${title}".`,
      enFallback: (title) => `A hiring manager would see that the author can connect brand strategy with user motivation, using "${title}" to reason about how perception becomes action.`,
      ruWithThesis: (title) => `он показывает стратегическое мышление об опыте: умение переводить восприятие, место и мотивацию в более ясный продуктовый или брендовый опыт через "${title}".`,
      ruFallback: (title) => `нанимающий менеджер увидит, что автор умеет связывать brand strategy с мотивацией пользователя на примере "${title}" и рассуждать о том, как восприятие превращается в действие.`,
      angleEn: (title) => `Use "${title}" to explain how brand and experience design can move people from passive admiration to active intent.`,
      angleRu: (title) => `Показать на примере "${title}", как бренд и experience design переводят пассивное восхищение в намерение действовать.`,
      summaryEn: (title) => `A post about how "${title}" shows the link between perception, motivation, and designed experiences that move people to act.`,
      summaryRu: (title) => `Пост о том, как "${title}" показывает связь между восприятием, мотивацией и спроектированным опытом, который побуждает к действию.`
    };
  }
  if (isServiceDiscovery) {
    return {
      enWithThesis: (title) => `it shows service-design thinking: the ability to connect discovery, timing, and user intent in a real product context, using "${title}" as evidence.`,
      enFallback: (title) => `A recruiter would see service-design judgment here: the post can use "${title}" to discuss how service and discovery products win when they respect user timing, context, and intent.`,
      ruWithThesis: (title) => `он показывает service-design мышление: умение связывать discovery, момент использования и пользовательское намерение в реальном продуктовом контексте на примере "${title}".`,
      ruFallback: (title) => `рекрутер увидит здесь зрелое service-design мышление: пост может разобрать "${title}" через то, как сервисные и discovery-продукты выигрывают за счёт контекста, timing и намерения пользователя.`,
      angleEn: (title) => `Use "${title}" to discuss how service and discovery products can reduce friction by matching timing, context, and intent.`,
      angleRu: (title) => `Разобрать "${title}" через то, как сервисные и discovery-продукты снижают фрикцию, когда попадают в timing, контекст и намерение пользователя.`,
      summaryEn: (title) => `A post about how "${title}" turns timing, context, and user intent into a service-design advantage.`,
      summaryRu: (title) => `Пост о том, как "${title}" превращает timing, контекст и пользовательское намерение в преимущество service design.`
    };
  }
  if (text.includes("brand") || text.includes("story") || text.includes("identity") || text.includes("communication") || text.includes("wordmark") || text.includes("typeface")) {
    return {
      enWithThesis: (title) => `it demonstrates brand-to-product reasoning: how visual identity and narrative choices can support comprehension, differentiation, and user memory in "${title}".`,
      enFallback: (title) => `This can signal strategic communication skill: the post can unpack "${title}" as a case of making a product easier to understand, remember, and trust.`,
      ruWithThesis: (title) => `он демонстрирует brand-to-product reasoning: как visual identity и narrative-решения поддерживают понимание, дифференциацию и запоминание продукта в "${title}".`,
      ruFallback: (title) => `это может показать навык стратегической коммуникации: пост разбирает "${title}" как пример того, как сделать продукт понятнее, запоминаемее и убедительнее.`,
      angleEn: (title) => `Use "${title}" to connect identity, narrative, and product comprehension instead of treating branding as decoration.`,
      angleRu: (title) => `Разобрать "${title}" через связь айдентики, нарратива и понимания продукта, а не как декоративный branding-кейс.`,
      summaryEn: (title) => `A post about how "${title}" connects identity, narrative, and product comprehension rather than treating brand work as decoration.`,
      summaryRu: (title) => `Пост о том, как "${title}" связывает айдентику, нарратив и понимание продукта, а не сводит бренд к декору.`
    };
  }
  if (text.includes("system") || text.includes("component") || text.includes("pattern") || text.includes("governance")) {
    return {
      enWithThesis: (title) => `it demonstrates systems thinking: the ability to use "${title}" to reason about consistency, scale, and decision quality.`,
      enFallback: (title) => `For hiring, "${title}" can show that the author thinks in systems: patterns, governance, consistency, and product decisions at scale.`,
      ruWithThesis: (title) => `он демонстрирует системное мышление: умение использовать "${title}" для разговора о консистентности, масштабе и качестве решений.`,
      ruFallback: (title) => `для hiring-аудитории "${title}" может показать, что автор мыслит системами: паттернами, governance, консистентностью и продуктовым масштабом.`,
      angleEn: (title) => `Use "${title}" to discuss how systems, patterns, and governance improve product decisions at scale.`,
      angleRu: (title) => `Разобрать "${title}" как пример того, как системы, паттерны и governance улучшают продуктовые решения на масштабе.`,
      summaryEn: (title) => `A post about how "${title}" turns systems, patterns, or governance into better product decisions at scale.`,
      summaryRu: (title) => `Пост о том, как "${title}" превращает системы, паттерны или governance в более качественные продуктовые решения на масштабе.`
    };
  }
  if (text.includes("startup") || text.includes("founder") || text.includes("market") || text.includes("strategy")) {
    return {
      enWithThesis: (title) => `it signals business awareness: the ability to connect design choices with market learning, positioning, and product strategy through "${title}".`,
      enFallback: (title) => `A recruiter would see business context here: "${title}" can become a post about how design supports positioning, learning speed, and product focus.`,
      ruWithThesis: (title) => `он сигнализирует бизнес-контекст: умение связывать дизайн-решения с рынком, позиционированием и продуктовой стратегией через "${title}".`,
      ruFallback: (title) => `рекрутер увидит здесь бизнес-контекст: "${title}" можно превратить в пост о том, как дизайн поддерживает позиционирование, скорость обучения и продуктовый фокус.`,
      angleEn: (title) => `Use "${title}" to connect design decisions with positioning, market learning, and product focus.`,
      angleRu: (title) => `Связать "${title}" с тем, как дизайн помогает позиционированию, обучению на рынке и продуктовому фокусу.`,
      summaryEn: (title) => `A post about how "${title}" connects design work with positioning, market learning, and product focus.`,
      summaryRu: (title) => `Пост о том, как "${title}" связывает дизайн-работу с позиционированием, обучением на рынке и продуктовым фокусом.`
    };
  }
  if (text.includes("digital") || text.includes("interaction") || text.includes("interface") || text.includes("experience")) {
    return {
      enWithThesis: (title) => `it shows interaction thinking: the ability to connect digital execution with user understanding, flow, and product clarity in "${title}".`,
      enFallback: (title) => `This can signal interaction-design judgment: "${title}" becomes a way to discuss how digital products shape understanding, flow, and confidence.`,
      ruWithThesis: (title) => `он показывает interaction thinking: умение связывать digital execution с пониманием пользователя, flow и ясностью продукта в "${title}".`,
      ruFallback: (title) => `это может показать зрелость в interaction design: "${title}" становится поводом обсудить, как цифровые продукты формируют понимание, flow и уверенность пользователя.`,
      angleEn: (title) => `Use "${title}" to explain how interaction choices shape understanding, flow, and confidence in a digital product.`,
      angleRu: (title) => `Разобрать "${title}" через то, как interaction-решения формируют понимание, flow и уверенность в цифровом продукте.`,
      summaryEn: (title) => `A post about how "${title}" shows the effect of interaction decisions on understanding, flow, and product confidence.`,
      summaryRu: (title) => `Пост о том, как "${title}" показывает влияние interaction-решений на понимание, flow и уверенность в продукте.`
    };
  }

  return {
    enWithThesis: (title) => `it shows structured product judgment: the ability to extract a usable design point of view from "${title}" without reducing it to a news repost.`,
    enFallback: (title) => `A recruiter would see structured thinking here: the author can turn "${title}" into a focused design argument with a clear professional point.`,
    ruWithThesis: (title) => `он показывает структурное продуктовое суждение: умение извлекать полезную дизайн-позицию из "${title}", не сводя материал к пересказу новости.`,
    ruFallback: (title) => `рекрутер увидит здесь структурное мышление: автор умеет превратить "${title}" в сфокусированный дизайн-аргумент с ясной профессиональной позицией.`,
    angleEn: (title) => `Use "${title}" to extract a focused product-design argument from the source instead of summarizing the article.`,
    angleRu: (title) => `Извлечь из "${title}" сфокусированный product-design аргумент, а не пересказывать материал.`,
    summaryEn: (title) => `A post that extracts one focused product-design argument from "${title}" instead of summarizing the source.`,
    summaryRu: (title) => `Пост, который извлекает из "${title}" один сфокусированный product-design аргумент, а не пересказывает источник.`
  };
}

function sourceBasedAngle(items: CollectedItemRecord[], fallback = "Use the source as a practitioner reflection on product design decisions."): string {
  const primary = items[0];
  if (!primary) {
    return fallback;
  }

  return inferHiringSignal(primary).angleEn(cleanTitle(primary.title));
}

function sourceBasedAngleRu(items: CollectedItemRecord[], fallback = "Разобрать материал как практическое наблюдение о продуктовых дизайн-решениях."): string {
  const primary = items[0];
  if (!primary) {
    return fallback;
  }

  return inferHiringSignal(primary).angleRu(cleanTitle(primary.title));
}

function firstUsefulText(...values: Array<string | null>): string | null {
  const value = values
    .map((item) => item?.trim())
    .find((item): item is string => Boolean(item && item.length > 30));

  return value ? value.slice(0, 360) : null;
}

function withSourceDigest(base: string, item: CollectedItemRecord): string {
  const digest = sourceDigest(item);
  return digest ? `${base} ${digest}` : base;
}

function sourceDigest(item: CollectedItemRecord): string | null {
  const text = firstUsefulText(item.summary, item.normalized_content, item.raw_content);
  if (!text) {
    return null;
  }

  const cleaned = text
    .replace(/&[#a-z0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const firstSentence = cleaned.match(/^[^.!?]+[.!?]?/)?.[0] ?? cleaned;
  const digest = firstSentence.length > 220 ? `${firstSentence.slice(0, 217).trim()}...` : firstSentence;

  return digest.length > 35 ? `Контекст материала: ${digest}` : null;
}

function cleanTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function usableAiTitle(value: string | undefined): string | undefined {
  if (!value || !isSpecificAiAngle(value)) {
    return undefined;
  }

  return usableAiField(value);
}

function usableAiField(value: string | undefined): string | undefined {
  if (!value || value.trim().length < 24) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (normalized.startsWith("based on ") || normalized.startsWith("основано на ")) {
    return undefined;
  }
  if (normalized.includes("how ai is changing product design work without replacing product responsibility")) {
    return undefined;
  }
  if (normalized.includes("why small form decisions can create outsized product friction")) {
    return undefined;
  }
  if (normalized.includes("почему маленькие решения в формах создают большую продуктовую фрикцию")) {
    return undefined;
  }

  return value;
}

function usableAiMaterialField(value: string | undefined, item: CollectedItemRecord): string | undefined {
  const candidate = usableAiField(value);
  if (!candidate || isGenericMaterialField(candidate)) {
    return undefined;
  }

  const lower = candidate.toLowerCase();
  const terms = materialSpecificTerms(item);
  const hasSpecificTerm = terms.some((term) => lower.includes(term));

  return hasSpecificTerm ? candidate : undefined;
}

function isGenericMaterialField(value: string): boolean {
  const normalized = value.toLowerCase();
  const genericPatterns = [
    "a possible post about",
    "a possible post that",
    "a post preview grounded in",
    "turns the material into",
    "turning the material into",
    "selected product/ux source material",
    "recent ux material",
    "clear professional point of view",
    "simple link repost",
    "product decisions, user effort, and design quality",
    "shows strategic thinking in communication",
    "shows professional thinking",
    "превращается не в пересказ ссылки",
    "возможный пост о",
    "возможный пост, который",
    "короткое описание возможного поста",
    "выбранного product/ux-материала",
    "ясную профессиональную позицию",
    "такой пост показывает стратегическое мышление",
    "показывает профессиональное мышление автора",
    "продуктовый взгляд, дизайн-суждение и связь с бизнес-контекстом",
    "разговор о продуктовых решениях, усилии пользователя и качестве дизайна"
  ];

  return genericPatterns.some((pattern) => normalized.includes(pattern));
}

function materialSpecificTerms(item: CollectedItemRecord): string[] {
  const text = `${item.title} ${item.summary ?? ""} ${item.normalized_content ?? ""}`.toLowerCase();
  const words = text
    .replace(/&[#a-z0-9]+;/gi, " ")
    .replace(/[^a-zа-яё0-9\s-]/gi, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 5 && !materialStopWords.has(word));

  const semanticTerms: string[] = [];
  if (text.includes("restaurant") || text.includes("discovery") || text.includes("service")) {
    semanticTerms.push("service", "timing", "intent", "context", "сервис", "контекст", "намерени", "момент");
  }
  if (text.includes("betting") || text.includes("finance") || text.includes("trust") || text.includes("regulated")) {
    semanticTerms.push("trust", "risk", "confidence", "regulated", "довер", "риск", "уверен", "категори");
  }
  if (text.includes("tourism") || text.includes("destination") || text.includes("place") || text.includes("visit")) {
    semanticTerms.push("tourism", "destination", "place", "motivation", "туризм", "место", "мотивац", "восприяти");
  }
  if (text.includes("brand") || text.includes("story") || text.includes("identity") || text.includes("communication") || text.includes("wordmark") || text.includes("typeface")) {
    semanticTerms.push("brand", "story", "identity", "communication", "memory", "бренд", "истори", "коммуникац", "айдентик", "запомин");
  }
  if (text.includes("research") || text.includes("study") || text.includes("insight") || text.includes("survey")) {
    semanticTerms.push("research", "evidence", "study", "insight", "исслед", "данн", "вывод", "доказ");
  }
  if (text.includes("system") || text.includes("component") || text.includes("pattern") || text.includes("governance")) {
    semanticTerms.push("system", "component", "pattern", "governance", "систем", "паттерн", "компонент", "масштаб");
  }
  if (text.includes("startup") || text.includes("founder") || text.includes("market") || text.includes("strategy")) {
    semanticTerms.push("startup", "founder", "market", "strategy", "positioning", "стартап", "фаундер", "рын", "стратег", "позиционир", "ценност");
  }
  if (text.includes("digital") || text.includes("interaction") || text.includes("interface") || text.includes("experience")) {
    semanticTerms.push("digital", "interaction", "interface", "flow", "цифров", "интерфейс", "flow", "взаимод");
  }

  return Array.from(new Set([...words, ...semanticTerms])).slice(0, 56);
}

const materialStopWords = new Set([
  "about",
  "after",
  "again",
  "article",
  "based",
  "biggest",
  "brand",
  "could",
  "design",
  "digital",
  "experience",
  "helps",
  "material",
  "people",
  "product",
  "shows",
  "source",
  "story",
  "their",
  "there",
  "through",
  "using",
  "would",
  "аудитории",
  "дизайн",
  "материал",
  "показывает",
  "пост",
  "продукт",
  "рекрутера",
  "ценность"
]);

function extractNovelty(item: CollectedItemRecord, ai: AiScoringResult | undefined): number | null {
  if (ai) {
    return ai.noveltyScore;
  }

  const breakdown = item.scoring_breakdown_json ? JSON.parse(item.scoring_breakdown_json) as { factors?: { freshness?: number } } : null;
  const freshness = breakdown?.factors?.freshness ?? 10;
  return Math.max(40, Math.min(80, 50 + freshness));
}

function isUsefulAiMaterial(ai: AiScoringResult, item: CollectedItemRecord): boolean {
  const professionalSignal = (ai.aiRelevanceScore * 0.45) + (ai.professionalValue * 0.45) + (ai.noveltyScore * 0.1);
  const ruleSignal = item.rule_score ?? item.final_score ?? 0;
  return professionalSignal >= 62 && ruleSignal >= 50;
}

function aiMaterialScore(ai: AiScoringResult | undefined, item: CollectedItemRecord): number {
  if (!ai) {
    return item.final_score ?? item.rule_score ?? 0;
  }

  return (ai.aiRelevanceScore * 0.4) + (ai.professionalValue * 0.4) + (ai.noveltyScore * 0.1) + ((item.rule_score ?? item.final_score ?? 0) * 0.1);
}

function keywordWeight(keyword: string): number {
  return keyword.includes(" ") ? 3 : 1;
}

function isSpecificAiAngle(angle: string): boolean {
  const normalized = angle.toLowerCase();
  if (normalized.includes("how ai is changing product design work without replacing product responsibility")) {
    return false;
  }
  if (normalized.includes("why small form decisions can create outsized product friction")) {
    return false;
  }
  if (normalized.includes("где ai помогает продуктовому дизайну")) {
    return false;
  }
  if (normalized.includes("почему маленькие решения в формах создают большую продуктовую фрикцию")) {
    return false;
  }

  return angle.length > 32 && angle.length < 180;
}

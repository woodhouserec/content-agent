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

  const groups = new Map<string, CollectedItemRecord[]>();

  for (const item of eligible) {
    const key = classifyItem(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const candidates: Array<TopicCandidate & { fingerprint: string }> = [];

  for (const [key, group] of groups) {
    const template = topicMap.find((topic) => topic.key === key) ?? topicMap[topicMap.length - 1];
    const topItems = group.slice(0, 3);
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
      summary: describePostFromSources(topItems),
      summaryRu: describePostFromSourcesRu(topItems),
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
    const suggestedAngleRu = usableAiField(ai.suggestedAngleRu) ?? sourceBasedAngleRu([item]);
    const summary = usableAiField(ai.shortDescription) ?? usableAiField(ai.keyThesis) ?? describePostFromSources([item]);
    const summaryRu = usableAiField(ai.shortDescriptionRu) ?? usableAiField(ai.keyThesisRu) ?? describePostFromSourcesRu([item]);
    const audienceValue = usableAiField(ai.audienceValue) ?? usableAiField(ai.explanation) ?? sourceBasedValue([item]);
    const hrValue = usableAiField(ai.hrValue) ?? "Shows how the author thinks about product quality, design judgment, and business context through a concrete source.";
    const audienceValueRu = usableAiField(ai.audienceValueRu) ?? sourceBasedValueRu([item]);
    const hrValueRu = usableAiField(ai.hrValueRu) ?? "Показывает профессиональное мышление автора через конкретный материал: продуктовый взгляд, дизайн-суждение и связь с бизнес-контекстом.";
    const recruiterValue = usableAiField(ai.recruiterValue) ?? usableAiField(ai.hrValue) ?? sourceBasedRecruiterValue([item], ai);
    const recruiterValueRu = usableAiField(ai.recruiterValueRu) ?? usableAiField(ai.hrValueRu) ?? sourceBasedRecruiterValueRu([item], ai);
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

function describePostFromSources(items: CollectedItemRecord[]): string {
  const primary = items[0];
  if (!primary) {
    return "A post preview grounded in the selected Product/UX source material.";
  }

  const summary = firstUsefulText(primary.summary, primary.normalized_content, primary.raw_content);
  return summary
    ? `A possible post about the design decisions behind "${cleanTitle(primary.title)}": ${summary}`
    : `A possible post that turns "${cleanTitle(primary.title)}" into a practical Product/UX reflection.`;
}

function describePostFromSourcesRu(items: CollectedItemRecord[]): string {
  const primary = items[0];
  if (!primary) {
    return "Короткое описание возможного поста на основе выбранного Product/UX-материала.";
  }

  const summary = firstUsefulText(primary.summary, primary.normalized_content, primary.raw_content);
  return summary
    ? `Возможный пост о продуктовых и UX-решениях в материале "${cleanTitle(primary.title)}": ${summary}`
    : `Возможный пост, который превращает материал "${cleanTitle(primary.title)}" в практическое Product/UX-наблюдение.`;
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
  const skill = inferHiringSignal(primary);
  const title = cleanTitle(primary.title);

  return thesis
    ? `Key thesis: ${thesis} Recruiter value: this post would show ${skill} through a concrete analysis of "${title}".`
    : `Recruiter value: this post would show ${skill} by turning "${title}" into a clear professional point of view instead of a simple link repost.`;
}

function sourceBasedRecruiterValueRu(items: CollectedItemRecord[], ai?: AiScoringResult): string | null {
  const primary = items[0];
  if (!primary) {
    return null;
  }

  const thesis = usableAiField(ai?.keyThesisRu);
  const skill = inferHiringSignalRu(primary);
  const title = cleanTitle(primary.title);

  return thesis
    ? `Ключевой смысловой тезис: ${thesis} Ценность для рекрутера: такой пост показывает ${skill} через конкретный разбор материала "${title}".`
    : `Ценность для рекрутера: такой пост показывает ${skill}, потому что материал "${title}" превращается не в пересказ ссылки, а в ясную профессиональную позицию.`;
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

function inferHiringSignal(item: CollectedItemRecord): string {
  const text = `${item.title} ${item.summary ?? ""} ${item.normalized_content ?? ""}`.toLowerCase();

  if (text.includes("brand") || text.includes("story") || text.includes("identity") || text.includes("communication")) {
    return "strategic communication and the ability to connect brand perception with product experience";
  }
  if (text.includes("research") || text.includes("study") || text.includes("insight") || text.includes("survey")) {
    return "research maturity and the ability to translate evidence into product decisions";
  }
  if (text.includes("system") || text.includes("component") || text.includes("pattern") || text.includes("governance")) {
    return "systems thinking and judgment about scalable design decisions";
  }
  if (text.includes("startup") || text.includes("founder") || text.includes("market") || text.includes("strategy")) {
    return "business awareness and the ability to connect design work with market and product strategy";
  }
  if (text.includes("digital") || text.includes("interaction") || text.includes("interface") || text.includes("experience")) {
    return "interaction thinking and the ability to reason about digital product experience";
  }

  return "product judgment, structured thinking, and the ability to extract a useful design perspective from source material";
}

function inferHiringSignalRu(item: CollectedItemRecord): string {
  const text = `${item.title} ${item.summary ?? ""} ${item.normalized_content ?? ""}`.toLowerCase();

  if (text.includes("brand") || text.includes("story") || text.includes("identity") || text.includes("communication")) {
    return "стратегическое мышление в коммуникации и умение связывать восприятие бренда с продуктовым опытом";
  }
  if (text.includes("research") || text.includes("study") || text.includes("insight") || text.includes("survey")) {
    return "исследовательскую зрелость и умение переводить evidence в продуктовые решения";
  }
  if (text.includes("system") || text.includes("component") || text.includes("pattern") || text.includes("governance")) {
    return "системное мышление и зрелое суждение о масштабируемых дизайн-решениях";
  }
  if (text.includes("startup") || text.includes("founder") || text.includes("market") || text.includes("strategy")) {
    return "бизнес-контекст и умение связывать дизайн с рынком и продуктовой стратегией";
  }
  if (text.includes("digital") || text.includes("interaction") || text.includes("interface") || text.includes("experience")) {
    return "мышление об interaction design и способность рассуждать о цифровом продуктовом опыте";
  }

  return "продуктовое суждение, структурное мышление и умение извлекать полезную дизайн-позицию из внешнего материала";
}

function sourceBasedAngle(items: CollectedItemRecord[], fallback = "Use the source as a practitioner reflection on product design decisions."): string {
  const primary = items[0];
  if (!primary) {
    return fallback;
  }

  return `Use "${cleanTitle(primary.title)}" as a practitioner reflection on what this material reveals about product design decisions, user friction, and team judgment.`;
}

function sourceBasedAngleRu(items: CollectedItemRecord[], fallback = "Разобрать материал как практическое наблюдение о продуктовых дизайн-решениях."): string {
  const primary = items[0];
  if (!primary) {
    return fallback;
  }

  return `Разобрать "${cleanTitle(primary.title)}" как практическое наблюдение о продуктовых дизайн-решениях, пользовательском усилии и профессиональном суждении команды.`;
}

function firstUsefulText(...values: Array<string | null>): string | null {
  const value = values
    .map((item) => item?.trim())
    .find((item): item is string => Boolean(item && item.length > 30));

  return value ? value.slice(0, 360) : null;
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

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
  const eligible = items
    .filter((item) => (item.final_score ?? 0) >= (options.minFinalScoreForTopic ?? scoringConfig.minFinalScoreForTopic))
    .sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0));
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
      : template.title;
    const suggestedAngle = template.angle;
    const fingerprint = await createTopicFingerprint(title, suggestedAngle, sourceItemIds);

    candidates.push({
      title,
      titleRu: template.titleRu,
      summary: summarizeGroup(topItems),
      summaryRu: summarizeGroupRu(topItems),
      whyItMatters: template.whyItMatters,
      whyItMattersRu: template.whyItMattersRu,
      suggestedAngle,
      suggestedAngleRu: template.angleRu,
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

function summarizeGroup(items: CollectedItemRecord[]): string {
  const titles = items.map((item) => item.title).slice(0, 3);
  return `Based on ${titles.length} recent source item${titles.length === 1 ? "" : "s"}: ${titles.join("; ")}.`;
}

function summarizeGroupRu(items: CollectedItemRecord[]): string {
  const titles = items.map((item) => item.title).slice(0, 3);
  return `Основано на ${titles.length} материал${titles.length === 1 ? "е" : "ах"}: ${titles.join("; ")}.`;
}

function extractNovelty(item: CollectedItemRecord, ai: AiScoringResult | undefined): number | null {
  if (ai) {
    return ai.noveltyScore;
  }

  const breakdown = item.scoring_breakdown_json ? JSON.parse(item.scoring_breakdown_json) as { factors?: { freshness?: number } } : null;
  const freshness = breakdown?.factors?.freshness ?? 10;
  return Math.max(40, Math.min(80, 50 + freshness));
}

function keywordWeight(keyword: string): number {
  return keyword.includes(" ") ? 3 : 1;
}

function isSpecificAiAngle(angle: string): boolean {
  const normalized = angle.toLowerCase();
  if (normalized.includes("how ai is changing product design work without replacing product responsibility")) {
    return false;
  }

  return angle.length > 32 && angle.length < 180;
}

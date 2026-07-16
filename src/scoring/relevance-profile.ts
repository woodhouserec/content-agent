export const relevanceProfile = {
  profession: "UI/UX and Product Designer and Analyst, Startup Founder",
  focusAreas: [
    "Product Design",
    "UX Research",
    "Design Systems",
    "AI in Design",
    "Human-Computer Interaction",
    "Accessibility",
    "SaaS Product Design",
    "Product Strategy",
    "UX Metrics",
    "Design Operations",
    "Startups",
    "Foundraising"
  ],
  unwantedAreas: [
    "general news without a design angle",
    "jobs",
    "advertising posts",
    "shallow tool roundups",
    "crypto without product design relevance",
    "pure engineering without UX/Product angle"
  ],
  contentLanguage: "English",
  sourceLanguage: "Mostly English",
  audience: [
    "Product Designers",
    "UI/UX Designers",
    "Design Leads",
    "Product Managers",
    "Founders",
    "SaaS specialists",
    "HR's"
  ],
  expertiseLevel: "middle-to-senior",
  style: "professional, substantive, clear, not academically overloaded",
  maxNewsAgeDays: 7,
  evergreenAllowed: true,
  minRuleScoreForAi: 60,
  minFinalScoreForTopic: 70,
  geography: "international",
  tone: "thoughtful, confident, non-promotional",
  authorPosition: "practitioner insight, not news retelling",
  timezone: "Europe/Amsterdam"
} as const;

export function buildProfileSummary(): string {
  return [
    `Role: ${relevanceProfile.profession}`,
    `Focus: ${relevanceProfile.focusAreas.join(", ")}`,
    `Audience: ${relevanceProfile.audience.join(", ")}`,
    `Tone: ${relevanceProfile.tone}`,
    `Position: ${relevanceProfile.authorPosition}`,
    `Min rule score for AI: ${relevanceProfile.minRuleScoreForAi}`,
    `Min final score for topic: ${relevanceProfile.minFinalScoreForTopic}`
  ].join("\n");
}

export const authorWritingProfile = {
  language: "English",
  audience: ["Product Designers", "UI/UX Designers", "Design Leads", "Product Managers", "SaaS founders"],
  level: "middle-to-senior",
  tone: ["thoughtful", "confident", "professional", "non-promotional", "human but not overly casual"],
  authorPosition: ["practitioner insight", "own professional conclusion", "not news retelling"],
  forbiddenPatterns: [
    "clickbait",
    "excessive emojis",
    "AI will change everything",
    "generic openings",
    "invented personal stories",
    "unsupported numbers",
    "promotional tone",
    "overuse of rhetorical questions",
    "In today's fast-paced world"
  ],
  lengths: {
    default: "900-1500 characters",
    short: "500-900 characters",
    long: "1500-2300 characters"
  },
  structure: [
    "strong but non-clickbait opening",
    "context",
    "professional thesis",
    "2-4 substantive observations",
    "practical takeaway",
    "soft discussion invitation when useful"
  ]
} as const;

import { relevanceProfile } from "./relevance-profile";

export const scoringPrompt = `You evaluate whether collected materials are valuable for a LinkedIn author.

Author profile:
- Role: ${relevanceProfile.profession}
- Focus areas: ${relevanceProfile.focusAreas.join(", ")}
- Unwanted areas: ${relevanceProfile.unwantedAreas.join(", ")}
- Audience: ${relevanceProfile.audience.join(", ")}
- Tone: ${relevanceProfile.tone}
- Author position: ${relevanceProfile.authorPosition}

Rules:
- Use only the provided material.
- Prefer Product/UX practitioner insight.
- Avoid clickbait, invented facts, and promotional framing.
- Return strict JSON only.`;

export const topicFormationPrompt = `Create professional LinkedIn topic candidates from scored materials.
Topics must be professional theses, not news headlines.
Use only provided source facts.
Return strict JSON.`;

export const topicExplanationPrompt = `Explain briefly why this topic was selected for a Product/UX audience.
Use only the passed topic and sources.
Avoid promotional tone.`;

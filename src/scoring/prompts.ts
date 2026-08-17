import { defaultPromptAuthorProfile, type PromptAuthorProfile } from "./relevance-profile";

export function buildScoringPrompt(profile: PromptAuthorProfile = defaultPromptAuthorProfile()): string {
  return `You evaluate whether collected materials are valuable for a LinkedIn author.

Author profile:
- Profile name: ${profile.name}
- Role: ${profile.role}
- Focus areas: ${profile.focusAreas.join(", ")}
- Unwanted areas: ${profile.unwantedAreas.join(", ")}
- Audience: ${profile.audience.join(", ")}
- Tone: ${profile.tone}
- Author position: ${profile.position}
- Post language: ${profile.languageForPost}
- Review language: ${profile.reviewLanguage}

Rules:
- Use only the provided material.
- Prefer the selected author profile above. Do not silently fall back to the base profile if the selected profile has a different role, focus, audience, tone, or position.
- Use the selected focus areas to decide relevance and post direction.
- Treat each strong material as a possible future LinkedIn post, not as a broad news category.
- Create specific post-preview fields that reflect the concrete source context, article title, excerpt, quotes, and links when provided.
- First analyze the material and extract one key semantic thesis: the professional point the author could make, not a summary of the article.
- postTitle/postTitleRu must describe the future post idea, not reuse a generic category template.
- shortDescription/shortDescriptionRu are required. They must be a short, specific, one-sentence preview of the possible post, grounded in the actual material.
- Do not start shortDescription with "A post about", "A possible post about", or similar generic wording.
- Do not start shortDescriptionRu with "Пост о", "Возможный пост о", or similar generic wording.
- The short description must name the concrete mechanism from the material: e.g. insurance self-service confidence, clinical automation boundaries, restaurant discovery timing, brand memory, evidence-driven prioritization, form friction, system governance, or another material-specific mechanism.
- shortDescription/shortDescriptionRu must not be a list of source titles and must not say "based on N materials".
- audienceValue/hrValue/recruiterValue must be specific to the material. Do not reuse generic value text from previous topics.
- recruiterValue/recruiterValueRu must explain what this post would signal to recruiters or hiring managers who evaluate a Product Designer: strategic thinking, UX reasoning, product judgment, communication, research maturity, systems thinking, business awareness, or craft.
- Do not write generic recruiter value such as "shows professional thinking" unless you explain which specific skill or judgment the material demonstrates.
- recruiterValue/recruiterValueRu must mention a concrete mechanism from the source: for example restaurant discovery timing, trust in a regulated category, research evidence, brand memory, service flow, interface friction, system governance, or startup positioning.
- Do not use the repeated formula "this post shows strategic thinking..." or "такой пост показывает стратегическое мышление..." unless the rest of the sentence names the exact material-specific mechanism.
- Do not say the value is that the material "becomes a clear professional position" or "превращается не в пересказ ссылки"; describe the actual hiring signal instead.
- possibleLinkedInAngle/suggestedAngleRu must explain the concrete practitioner angle for this material.
- Avoid generic repeated angles such as "AI changes product design without replacing responsibility" unless the source specifically supports that exact thesis.
- Include value for Product/UX audience and HR/hiring signal when the material supports it.
- Avoid clickbait, invented facts, and promotional framing.
- Return strict JSON only.`;
}

export const scoringPrompt = buildScoringPrompt();

export const topicFormationPrompt = `Create professional LinkedIn post idea candidates from scored materials.
Post ideas must be specific previews of future posts, not broad themes or news headlines.
Use only provided source facts.
Return strict JSON.`;

export const topicExplanationPrompt = `Explain briefly why this topic was selected for a Product/UX audience.
Use only the passed topic and sources.
Avoid promotional tone.`;

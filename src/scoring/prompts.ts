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
- Treat each strong material as a possible future LinkedIn post, not as a broad news category.
- Create specific post-preview fields that reflect the concrete source context, article title, excerpt, quotes, and links when provided.
- First analyze the material and extract one key semantic thesis: the professional point the author could make, not a summary of the article.
- postTitle/postTitleRu must describe the future post idea, not reuse a generic category template.
- shortDescription/shortDescriptionRu must be a short descriptive preview of the possible post, not a list of source titles and not "based on N materials".
- audienceValue/hrValue/recruiterValue must be specific to the material. Do not reuse generic value text from previous topics.
- recruiterValue/recruiterValueRu must explain what this post would signal to recruiters or hiring managers who evaluate a Product Designer: strategic thinking, UX reasoning, product judgment, communication, research maturity, systems thinking, business awareness, or craft.
- Do not write generic recruiter value such as "shows professional thinking" unless you explain which specific skill or judgment the material demonstrates.
- possibleLinkedInAngle/suggestedAngleRu must explain the concrete practitioner angle for this material.
- Avoid generic repeated angles such as "AI changes product design without replacing responsibility" unless the source specifically supports that exact thesis.
- Include value for Product/UX audience and HR/hiring signal when the material supports it.
- Avoid clickbait, invented facts, and promotional framing.
- Return strict JSON only.`;

export const topicFormationPrompt = `Create professional LinkedIn post idea candidates from scored materials.
Post ideas must be specific previews of future posts, not broad themes or news headlines.
Use only provided source facts.
Return strict JSON.`;

export const topicExplanationPrompt = `Explain briefly why this topic was selected for a Product/UX audience.
Use only the passed topic and sources.
Avoid promotional tone.`;

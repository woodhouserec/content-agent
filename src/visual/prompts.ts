export const visualBriefPrompt = `Create a visual brief for a LinkedIn post illustration.
The illustration must be editorial vector style, conceptual, non-photorealistic, and professional.
Avoid literal screenshots, logos, UI replicas, charts with unreadable text, or excessive words inside the image.
Use only the provided draft and topic. Do not invent facts.
The concept, metaphor, and composition must be specific to the draft's argument. Avoid generic "human designer with AI assistant" concepts unless the draft is explicitly about that.
If the post is about research, trust, forms, brand memory, service timing, accessibility, or systems, choose a metaphor grounded in that exact theme.
Use author_profile from the user payload as audience and positioning context when available.
Use preference_memory as lightweight visual style guidance when available.
Return strict JSON with: concept, metaphor, composition, style, color_direction, aspect_ratio.`;

export function buildImagePrompt(input: {
  concept: string;
  metaphor: string | null;
  composition: string | null;
  style: string | null;
  colorDirection: string | null;
  aspectRatio: string;
  preferenceMemory?: string;
}): string {
  return [
    "Create an editorial vector illustration for a LinkedIn post.",
    "No photorealism. No brand logos. Minimal or no text inside the image.",
    "Use conceptual metaphor, clean composition, sophisticated product/design audience tone.",
    `Concept: ${input.concept}`,
    input.metaphor ? `Metaphor: ${input.metaphor}` : null,
    input.composition ? `Composition: ${input.composition}` : null,
    input.style ? `Style: ${input.style}` : "Style: editorial vector illustration",
    input.colorDirection ? `Color direction: ${input.colorDirection}` : "Color direction: restrained, recognizable, not generic purple gradient",
    `Aspect ratio: ${input.aspectRatio}`,
    input.preferenceMemory ? `Preference memory:\n${input.preferenceMemory}` : null
  ].filter(Boolean).join("\n");
}

export function buildCustomImagePrompt(input: {
  concept: string;
  metaphor: string | null;
  composition: string | null;
  style: string | null;
  colorDirection: string | null;
  aspectRatio: string;
  userInstruction: string;
  preferenceMemory?: string;
}): string {
  return [
    "Create a LinkedIn post visual based on the existing visual brief and the user's revision instruction.",
    "The user's visual revision instruction has priority over the default style direction, including style choices such as photorealism, illustration, collage, minimalism, or other aesthetics.",
    "Do not include brand logos, copyrighted characters, UI screenshots, or excessive text inside the image unless explicitly requested and safe.",
    `User visual revision instruction: ${input.userInstruction.slice(0, 900)}`,
    "",
    `Original concept: ${input.concept}`,
    input.metaphor ? `Original metaphor: ${input.metaphor}` : null,
    input.composition ? `Original composition: ${input.composition}` : null,
    input.style ? `Original style: ${input.style}` : null,
    input.colorDirection ? `Original color direction: ${input.colorDirection}` : null,
    `Aspect ratio: ${input.aspectRatio}`,
    input.preferenceMemory ? `Preference memory:\n${input.preferenceMemory}` : null
  ].filter(Boolean).join("\n");
}

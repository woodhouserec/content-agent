export const visualBriefPrompt = `Create a visual brief for a LinkedIn post illustration.
The illustration must be editorial vector style, conceptual, non-photorealistic, and professional.
Avoid literal screenshots, logos, UI replicas, charts with unreadable text, or excessive words inside the image.
Use only the provided draft and topic. Do not invent facts.
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

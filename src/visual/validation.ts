export interface VisualBriefData {
  concept: string;
  metaphor: string | null;
  composition: string | null;
  style: string;
  colorDirection: string;
  aspectRatio: string;
}

export function validateVisualBriefResponse(value: unknown): VisualBriefData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid visual brief JSON response");
  }

  const record = value as Record<string, unknown>;

  return {
    concept: expectText(record.concept, "concept", 20),
    metaphor: optionalText(record.metaphor, "metaphor"),
    composition: optionalText(record.composition, "composition"),
    style: expectText(record.style, "style"),
    colorDirection: expectText(record.color_direction, "color_direction"),
    aspectRatio: normalizeAspectRatio(record.aspect_ratio)
  };
}

function expectText(value: unknown, field: string, minLength = 1): string {
  if (typeof value !== "string" || value.trim().length < minLength) {
    throw new Error(`Invalid ${field} in visual brief response`);
  }

  return value.trim();
}

function optionalText(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return expectText(value, field);
}

function normalizeAspectRatio(value: unknown): string {
  const ratio = typeof value === "string" ? value.trim() : "1:1";
  return ["1:1", "4:5", "16:9"].includes(ratio) ? ratio : "1:1";
}

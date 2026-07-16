import { sha256Hex } from "../utils/hash";
import { normalizeWhitespace } from "../utils/text";

export async function createTopicFingerprint(title: string, suggestedAngle: string, sourceItemIds: string[]): Promise<string> {
  const normalized = [
    normalizeForFingerprint(title),
    normalizeForFingerprint(suggestedAngle),
    [...sourceItemIds].sort().join(",")
  ].join("|");

  return sha256Hex(normalized);
}

export function normalizeForFingerprint(value: string): string {
  return (normalizeWhitespace(value) ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(the|a|an|and|or|of|to|in|for|with|why|how)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

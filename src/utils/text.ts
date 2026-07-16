export function stripHtml(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  const withoutCdata = input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const withoutTags = withoutCdata
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return normalizeWhitespace(decodeXmlEntities(withoutTags));
}

export function normalizeWhitespace(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  const normalized = input.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

export function truncateText(input: string | null, maxLength: number): string | null {
  if (!input) {
    return null;
  }

  return input.length > maxLength ? input.slice(0, maxLength) : input;
}

export function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

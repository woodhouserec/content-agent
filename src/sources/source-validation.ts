import { detectFeedType, parseFeedEntries, parseFeedTitle } from "../collectors/xml";
import { fetchTextWithRetry } from "../collectors/http";
import { canonicalizeUrl } from "../utils/url";
import { extractDiscoveryPagePreview } from "./discovery-page";

export interface SourceValidationResult {
  ok: boolean;
  normalizedUrl: string;
  detectedType: "rss" | "atom" | "discovery_page" | "unsupported";
  feedTitle: string | null;
  sampleItems: Array<{ title: string | null; url: string | null }>;
  errorMessage: string | null;
}

export async function validateRssSourceUrl(rawUrl: string): Promise<SourceValidationResult> {
  let normalizedUrl: string;

  try {
    normalizedUrl = canonicalizeUrl(rawUrl);
  } catch {
    return unsupported(rawUrl, "URL is not valid.");
  }

  if (!normalizedUrl.startsWith("https://") && !normalizedUrl.startsWith("http://")) {
    return unsupported(normalizedUrl, "Only HTTP and HTTPS URLs are supported.");
  }

  try {
    const xml = await fetchTextWithRetry(normalizedUrl, {
      timeoutMs: 6000,
      retries: 1,
      userAgent: "ContentAgent/0.3 SourceValidator (+https://github.com/woodhouserec/content-agent)",
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5"
    });
    const detectedType = detectFeedType(xml);

    if (detectedType === "unsupported") {
      const discovery = extractDiscoveryPagePreview(normalizedUrl, xml, 8);

      if (discovery.links.length > 0) {
        return {
          ok: true,
          normalizedUrl,
          detectedType: "discovery_page",
          feedTitle: discovery.title ?? discovery.siteName,
          sampleItems: discovery.links.slice(0, 5).map((link) => ({ title: link.title, url: link.url })),
          errorMessage: null
        };
      }

      return unsupported(normalizedUrl, "The URL is reachable, but it does not look like RSS, Atom, or a static discovery page with article links.");
    }

    const entries = parseFeedEntries(xml);

    if (entries.length === 0) {
      return unsupported(normalizedUrl, "Feed was detected, but no entries were found.");
    }

    return {
      ok: true,
      normalizedUrl,
      detectedType,
      feedTitle: parseFeedTitle(xml),
      sampleItems: entries.slice(0, 3).map((entry) => ({ title: entry.title, url: entry.url })),
      errorMessage: null
    };
  } catch (error: unknown) {
    return unsupported(normalizedUrl, error instanceof Error ? error.message : String(error));
  }
}

function unsupported(url: string, message: string): SourceValidationResult {
  return {
    ok: false,
    normalizedUrl: url,
    detectedType: "unsupported",
    feedTitle: null,
    sampleItems: [],
    errorMessage: message
  };
}

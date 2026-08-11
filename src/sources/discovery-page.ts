import { canonicalizeUrl } from "../utils/url";
import { normalizeWhitespace, stripHtml, truncateText } from "../utils/text";

export interface DiscoveryPageLink {
  title: string;
  url: string;
}

export interface DiscoveryPagePreview {
  title: string | null;
  siteName: string;
  links: DiscoveryPageLink[];
}

const ignoredText = new Set([
  "home",
  "about",
  "contact",
  "advertise",
  "newsletter",
  "privacy",
  "terms",
  "cookies",
  "instagram",
  "facebook",
  "linkedin",
  "twitter",
  "x",
  "pinterest",
  "search",
  "subscribe",
  "more"
]);

export function extractDiscoveryPagePreview(url: string, html: string, limit = 10): DiscoveryPagePreview {
  const base = new URL(url);
  const title = readOpenGraph(html, "og:title") ?? readTitle(html);
  const siteName = readOpenGraph(html, "og:site_name") ?? base.hostname;
  const links = extractDiscoveryLinks(url, html, limit);

  return {
    title,
    siteName,
    links
  };
}

export function extractDiscoveryLinks(baseUrl: string, html: string, limit = 10): DiscoveryPageLink[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const candidates = [...cleanHtml(html).matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .flatMap((match) => {
      const href = match[1];
      const text = normalizeWhitespace(stripHtml(match[2])) ?? "";

      if (!href || !looksLikeArticleTitle(text)) {
        return [];
      }

      try {
        const url = new URL(href, baseUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          return [];
        }
        if (!isSameSite(base.hostname, url.hostname)) {
          return [];
        }
        if (!looksLikeArticlePath(url.pathname)) {
          return [];
        }

        const canonical = canonicalizeUrl(url.toString());
        if (seen.has(canonical)) {
          return [];
        }
        seen.add(canonical);

        return [{
          title: truncateText(text, 180) ?? text,
          url: canonical
        }];
      } catch {
        return [];
      }
    });

  return candidates.slice(0, limit);
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ");
}

function looksLikeArticleTitle(text: string): boolean {
  const normalized = text.trim();
  if (normalized.length < 18 || normalized.length > 220) {
    return false;
  }
  if (ignoredText.has(normalized.toLowerCase())) {
    return false;
  }
  return /[a-zа-я0-9]/i.test(normalized) && normalized.split(/\s+/).length >= 3;
}

function looksLikeArticlePath(pathname: string): boolean {
  const path = pathname.toLowerCase();
  if (path === "/" || path.includes("/tag/") || path.includes("/category/") || path.includes("/author/")) {
    return false;
  }
  if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip)$/i.test(path)) {
    return false;
  }
  const segments = path.split("/").filter(Boolean);
  return segments.length >= 2 || /\d{4}/.test(path);
}

function isSameSite(baseHostname: string, linkHostname: string): boolean {
  return linkHostname === baseHostname || linkHostname.endsWith(`.${baseHostname}`) || baseHostname.endsWith(`.${linkHostname}`);
}

function readTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return normalizeWhitespace(stripHtml(match?.[1] ?? null));
}

function readOpenGraph(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return normalizeWhitespace(stripHtml(pattern.exec(html)?.[1] ?? null));
}

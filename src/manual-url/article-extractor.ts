import { canonicalizeUrl } from "../utils/url";
import { normalizeWhitespace, stripHtml, truncateText } from "../utils/text";
import type { ArticleFetchResult } from "./article-fetcher";
import type { ExtractedArticle } from "./types";

export class ArticleExtractor {
  extract(originalUrl: string, fetched: ArticleFetchResult): ExtractedArticle {
    const html = fetched.html;
    const openGraph = extractOpenGraph(html);
    const canonicalUrl = readLinkHref(html, "canonical") ?? openGraph["og:url"] ?? fetched.finalUrl;
    const description = readMeta(html, "description") ?? openGraph["og:description"] ?? null;
    const title = openGraph["og:title"] ?? readTitle(html);
    const articleHtml = extractArticleHtml(html);
    const articleText = extractArticleText(html);
    const text = truncateText(articleText, 8000);
    const warnings: string[] = [];

    if (!text || text.length < 500) {
      warnings.push("Only limited article text could be extracted from static HTML.");
    }

    if (!description) {
      warnings.push("Description metadata is missing.");
    }

    const extractionStatus = title || description || text
      ? text && text.length >= 500 ? "accepted" : "partial"
      : "unsupported";

    return {
      originalUrl,
      finalUrl: fetched.finalUrl,
      canonicalUrl: canonicalizeUrl(canonicalUrl),
      title,
      author: readMeta(html, "author") ?? readMeta(html, "article:author"),
      publishedAt: parseDate(readMeta(html, "article:published_time") ?? readMeta(html, "date") ?? readTimeDatetime(html)),
      description,
      text,
      language: readHtmlLang(html),
      siteName: openGraph["og:site_name"] ?? new URL(fetched.finalUrl).hostname,
      openGraph,
      links: extractLinks(articleHtml, fetched.finalUrl),
      quotes: extractQuotes(articleHtml),
      extractionStatus,
      extractionMethod: "static_html_metadata",
      extractionWarnings: warnings,
      fetchedAt: fetched.fetchedAt,
      contentLength: fetched.contentLength
    };
  }
}

function readTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return normalizeWhitespace(stripHtml(match?.[1] ?? null));
}

function readMeta(html: string, name: string): string | null {
  const escaped = escapeRegExp(name);
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i")
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);

    if (match?.[1]) {
      return normalizeWhitespace(stripHtml(match[1]));
    }
  }

  return null;
}

function extractOpenGraph(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  const matches = html.match(/<meta[^>]+property=["']og:[^"']+["'][^>]*>/gi) ?? [];

  for (const tag of matches) {
    const property = /property=["']([^"']+)["']/i.exec(tag)?.[1];
    const content = /content=["']([^"']+)["']/i.exec(tag)?.[1];

    if (property && content) {
      result[property] = normalizeWhitespace(stripHtml(content)) ?? content;
    }
  }

  return result;
}

function readLinkHref(html: string, rel: string): string | null {
  const pattern = new RegExp(`<link[^>]+rel=["'][^"']*${escapeRegExp(rel)}[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>`, "i");
  return pattern.exec(html)?.[1] ?? null;
}

function extractArticleText(html: string): string | null {
  return normalizeWhitespace(stripHtml(cleanArticleHtml(extractArticleHtml(html))));
}

function extractArticleHtml(html: string): string {
  const articleMatch = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  const mainMatch = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  return articleMatch?.[1] ?? mainMatch?.[1] ?? html;
}

function cleanArticleHtml(html: string): string {
  return html
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
}

function extractQuotes(html: string): string[] {
  const quotes = [...cleanArticleHtml(html).matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi)]
    .map((match) => normalizeWhitespace(stripHtml(match[1])))
    .filter((quote): quote is string => Boolean(quote && quote.length >= 40))
    .map((quote) => truncateText(quote, 420) ?? quote);

  return unique(quotes).slice(0, 5);
}

function extractLinks(html: string, baseUrl: string): Array<{ text: string; url: string }> {
  const links = [...cleanArticleHtml(html).matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      const href = match[1];
      const text = normalizeWhitespace(stripHtml(match[2])) ?? "";
      if (!href || !text || text.length < 3) {
        return null;
      }

      try {
        const url = new URL(href, baseUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          return null;
        }
        return {
          text: truncateText(text, 120) ?? text,
          url: canonicalizeUrl(url.toString())
        };
      } catch {
        return null;
      }
    })
    .filter((link): link is { text: string; url: string } => Boolean(link));

  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.text}|${link.url}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, 12);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function readTimeDatetime(html: string): string | null {
  return /<time[^>]+datetime=["']([^"']+)["'][^>]*>/i.exec(html)?.[1] ?? null;
}

function readHtmlLang(html: string): string | null {
  return /<html[^>]+lang=["']([^"']+)["'][^>]*>/i.exec(html)?.[1] ?? null;
}

function parseDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

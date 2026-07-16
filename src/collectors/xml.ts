import { decodeXmlEntities, stripHtml } from "../utils/text";

export interface XmlEntry {
  externalId: string | null;
  title: string | null;
  url: string | null;
  summary: string | null;
  author: string | null;
  publishedAt: string | null;
  rawContent: string | null;
  metadata: Record<string, unknown>;
}

export function parseFeedEntries(xml: string): XmlEntry[] {
  const rssItems = extractBlocks(xml, "item");

  if (rssItems.length > 0) {
    return rssItems.map(parseRssItem);
  }

  return extractBlocks(xml, "entry").map(parseAtomEntry);
}

function parseRssItem(itemXml: string): XmlEntry {
  const title = readTagText(itemXml, "title");
  const link = readTagText(itemXml, "link");
  const guid = readTagText(itemXml, "guid");
  const summary = readTagText(itemXml, "description");
  const content = readTagText(itemXml, "content:encoded");
  const author = readTagText(itemXml, "dc:creator") ?? readTagText(itemXml, "author");
  const publishedAt = parseDate(readTagText(itemXml, "pubDate") ?? readTagText(itemXml, "published"));

  return {
    externalId: guid ?? link,
    title,
    url: link,
    summary,
    author,
    publishedAt,
    rawContent: content ?? summary,
    metadata: {
      feedFormat: "rss"
    }
  };
}

function parseAtomEntry(entryXml: string): XmlEntry {
  const title = readTagText(entryXml, "title");
  const id = readTagText(entryXml, "id");
  const summary = readTagText(entryXml, "summary");
  const content = readTagText(entryXml, "content");
  const author = readNestedTagText(entryXml, "author", "name");
  const publishedAt = parseDate(readTagText(entryXml, "published") ?? readTagText(entryXml, "updated"));

  return {
    externalId: id,
    title,
    url: readAtomLink(entryXml),
    summary,
    author,
    publishedAt,
    rawContent: content ?? summary,
    metadata: {
      feedFormat: "atom"
    }
  };
}

function extractBlocks(xml: string, tagName: string): string[] {
  const escaped = escapeRegExp(tagName);
  const pattern = new RegExp(`<${escaped}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${escaped}>`, "gi");
  return xml.match(pattern) ?? [];
}

function readTagText(xml: string, tagName: string): string | null {
  const escaped = escapeRegExp(tagName);
  const pattern = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i");
  const match = pattern.exec(xml);

  if (!match?.[1]) {
    return null;
  }

  return stripHtml(decodeXmlEntities(match[1]));
}

function readNestedTagText(xml: string, parentTag: string, childTag: string): string | null {
  const parent = extractBlocks(xml, parentTag)[0];
  return parent ? readTagText(parent, childTag) : null;
}

function readAtomLink(xml: string): string | null {
  const linkTags = xml.match(/<link\s+[^>]*>/gi) ?? [];

  for (const tag of linkTags) {
    const rel = readAttribute(tag, "rel");
    const href = readAttribute(tag, "href");

    if (href && (!rel || rel === "alternate")) {
      return decodeXmlEntities(href);
    }
  }

  return readTagText(xml, "link");
}

function readAttribute(tag: string, attributeName: string): string | null {
  const escaped = escapeRegExp(attributeName);
  const pattern = new RegExp(`${escaped}=["']([^"']+)["']`, "i");
  const match = pattern.exec(tag);
  return match?.[1] ? decodeXmlEntities(match[1]) : null;
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

import type { SourceRecord } from "../storage/sources";
import type { Collector } from "./types";
import { RedditCollector } from "./reddit";
import { RssCollector } from "./rss";

const collectors: Collector[] = [
  new RssCollector(),
  new RedditCollector()
];

export function getCollectorForSource(source: SourceRecord): Collector | null {
  return collectors.find((collector) => collector.type === source.type) ?? null;
}

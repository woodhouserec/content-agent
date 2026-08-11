import type { SourceRecord } from "../storage/sources";
import { parseSourceConfig } from "./config";
import type { Collector } from "./types";
import { DiscoveryPageCollector } from "./discovery-page";
import { RedditCollector } from "./reddit";
import { RssCollector } from "./rss";

const collectors: Collector[] = [
  new RssCollector(),
  new DiscoveryPageCollector(),
  new RedditCollector()
];

export function getCollectorForSource(source: SourceRecord): Collector | null {
  const config = parseSourceConfig(source.config_json);
  const collectorType = config.collector_type ?? source.type;
  return collectors.find((collector) => collector.type === collectorType) ?? null;
}

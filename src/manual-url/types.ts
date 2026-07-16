export type ExtractionStatus = "accepted" | "partial" | "unsupported" | "rejected";

export interface ExtractedArticle {
  originalUrl: string;
  finalUrl: string;
  canonicalUrl: string;
  title: string | null;
  author: string | null;
  publishedAt: string | null;
  description: string | null;
  text: string | null;
  language: string | null;
  siteName: string | null;
  openGraph: Record<string, string>;
  extractionStatus: ExtractionStatus;
  extractionMethod: "static_html_metadata";
  extractionWarnings: string[];
  fetchedAt: string | null;
  contentLength: number;
}

export interface ManualUrlPreview {
  article: ExtractedArticle;
  duplicateItemId: string | null;
}

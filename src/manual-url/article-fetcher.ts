import { assertSafeHttpUrl } from "./url-safety";

export interface ArticleFetchResult {
  finalUrl: string;
  html: string;
  contentType: string;
  contentLength: number;
  fetchedAt: string;
}

const MAX_REDIRECTS = 3;
const MAX_BYTES = 500_000;
const TIMEOUT_MS = 7000;

export class ArticleFetcher {
  async fetch(url: string): Promise<ArticleFetchResult> {
    let current = assertSafeHttpUrl(url).toString();

    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const result = await this.fetchOnce(current);

      if (result.status >= 300 && result.status < 400 && result.location) {
        const next = new URL(result.location, current);
        assertSafeHttpUrl(next.toString());
        current = next.toString();
        continue;
      }

      if (result.status < 200 || result.status >= 300) {
        throw new Error(`HTTP ${result.status}`);
      }

      return {
        finalUrl: current,
        html: result.body,
        contentType: result.contentType,
        contentLength: result.contentLength,
        fetchedAt: new Date().toISOString()
      };
    }

    throw new Error("Too many redirects.");
  }

  private async fetchOnce(url: string): Promise<{ status: number; location: string | null; body: string; contentType: string; contentLength: number }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        redirect: "manual",
        headers: {
          "accept": "text/html, application/xhtml+xml, text/plain;q=0.8",
          "user-agent": "ContentAgent/0.4 ManualUrlIntake (+https://github.com/woodhouserec/content-agent)"
        },
        signal: controller.signal
      });
      const contentType = response.headers.get("content-type") ?? "";

      if (response.status >= 200 && response.status < 300 && !isAllowedContentType(contentType)) {
        throw new Error(`Unsupported content-type: ${contentType || "unknown"}`);
      }

      const text = await readLimitedText(response);

      return {
        status: response.status,
        location: response.headers.get("location"),
        body: text,
        contentType,
        contentLength: text.length
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function isAllowedContentType(contentType: string): boolean {
  const lower = contentType.toLowerCase();
  return lower.includes("text/html") || lower.includes("application/xhtml+xml") || lower.includes("text/plain");
}

async function readLimitedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();

  if (!reader) {
    return response.text();
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done || !value) {
      break;
    }

    total += value.byteLength;

    if (total > MAX_BYTES) {
      throw new Error("Response is too large.");
    }

    chunks.push(value);
  }

  const combined = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(combined);
}

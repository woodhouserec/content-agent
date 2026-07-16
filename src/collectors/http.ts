export interface FetchWithRetryOptions {
  timeoutMs: number;
  retries: number;
  userAgent: string;
  accept: string;
}

export async function fetchTextWithRetry(url: string, options: FetchWithRetryOptions): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      return await fetchText(url, options);
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryable(lastError) || attempt === options.retries) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error("Fetch failed");
}

async function fetchText(url: string, options: FetchWithRetryOptions): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), options.timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "accept": options.accept,
        "user-agent": options.userAgent
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function isRetryable(error: Error): boolean {
  return error.message.includes("HTTP 408")
    || error.message.includes("HTTP 429")
    || error.message.includes("HTTP 500")
    || error.message.includes("HTTP 502")
    || error.message.includes("HTTP 503")
    || error.message.includes("HTTP 504")
    || error.name === "AbortError";
}

export function assertSafeHttpUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  assertSafeHostname(url.hostname);
  return url;
}

export function assertSafeHostname(hostname: string): void {
  const normalized = hostname.toLowerCase();

  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    throw new Error("Localhost URLs are not allowed.");
  }

  if (normalized === "metadata.google.internal" || normalized === "metadata.cloudflare.com") {
    throw new Error("Metadata endpoints are not allowed.");
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(normalized)) {
    assertSafeIpv4(normalized);
  }
}

function assertSafeIpv4(ip: string): void {
  const [a = 0, b = 0] = ip.split(".").map((part) => Number(part));

  if (a === 10 || a === 127 || a === 0) throw new Error("Private or loopback IPs are not allowed.");
  if (a === 169 && b === 254) throw new Error("Link-local IPs are not allowed.");
  if (a === 172 && b >= 16 && b <= 31) throw new Error("Private IPs are not allowed.");
  if (a === 192 && b === 168) throw new Error("Private IPs are not allowed.");
  if (a === 100 && b >= 64 && b <= 127) throw new Error("Carrier-grade NAT IPs are not allowed.");
}

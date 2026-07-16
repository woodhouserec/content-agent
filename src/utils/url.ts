export function canonicalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hash = "";

  for (const key of [...url.searchParams.keys()]) {
    if (isTrackingParam(key)) {
      url.searchParams.delete(key);
    }
  }

  url.hostname = url.hostname.toLowerCase();

  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

function isTrackingParam(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.startsWith("utm_")
    || lower === "fbclid"
    || lower === "gclid"
    || lower === "mc_cid"
    || lower === "mc_eid";
}

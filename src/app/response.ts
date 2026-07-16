export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers
    }
  });
}

export function notFound(): Response {
  return jsonResponse({ ok: false, error: "Not found" }, { status: 404 });
}

export function htmlResponse(body: string, init?: ResponseInit): Response {
  return new Response(body, {
    ...init,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...init?.headers
    }
  });
}

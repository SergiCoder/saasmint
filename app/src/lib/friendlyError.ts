/**
 * Extract a human-readable message from an API error thrown by apiClient.
 *
 * apiClient throws `Error("API <status>: <body>")`. This helper tries to
 * parse the JSON body and return a useful string (either `detail` or a
 * joined array). Falls back to `fallback` when nothing can be extracted.
 */
export function friendlyError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const match = err.message.match(/^API \d+: (.+)$/s);
  if (!match) return fallback;
  try {
    const body = JSON.parse(match[1]) as { detail?: string } | string[];
    if (Array.isArray(body)) return body.join(" ");
    if (typeof body.detail === "string") return body.detail;
  } catch {
    // not JSON — fall through to fallback
  }
  return fallback;
}

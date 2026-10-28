/**
 * Where the demo checkout sends the visitor after a simulated payment: the
 * invoice's own /pay/complete URL from the payment link's `return` parameter
 * (it carries the PDF token), else the bare status page. Anything else is
 * rejected, so the parameter can't be used as an open redirect.
 */
export function returnPath(value: unknown, reference: string): string {
  const fallback = `/pay/complete?ref=${encodeURIComponent(reference)}`;
  if (typeof value !== "string" || value.length > 512 || !value.startsWith("/pay/complete?")) return fallback;
  const url = new URL(value, "http://localhost");
  if (url.pathname !== "/pay/complete" || url.searchParams.get("ref") !== reference) return fallback;
  return `${url.pathname}${url.search}`;
}

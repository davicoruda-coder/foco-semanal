/** Only allow same-origin relative paths (blocks open redirects). */
export function safeNextPath(raw: string | null | undefined, fallback = "/hoje"): string {
  if (!raw) return fallback;
  const path = raw.trim();
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback;
  if (path.includes("\\") || path.includes("@")) return fallback;
  if (/^[a-zA-Z][a-zA-Z+\-.]*:/.test(path)) return fallback;
  return path;
}

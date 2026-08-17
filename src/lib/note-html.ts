/** Converte HTML antigo de lembretes em texto puro, sem executar markup. */

export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

export function plainTextFromHtml(html: string): string {
  if (!html) return "";
  if (typeof DOMParser === "undefined") return stripTags(html);
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body?.textContent ?? "";
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Texto seguro para exibir; HTML antigo vira texto puro. */
export function noteHtmlFromStored(value: string): string {
  if (!value) return "";
  return escapeHtml(plainTextFromHtml(value)).replace(/\n/g, "<br>");
}

export function sanitizeNoteHtml(html: string): string {
  return escapeHtml(plainTextFromHtml(html));
}

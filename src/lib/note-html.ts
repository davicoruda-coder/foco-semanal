/** Helpers for sticky-note HTML stored in reminder.title */

const ALLOWED = new Set(["B", "STRONG", "I", "EM", "BR", "DIV", "SPAN", "P"]);

export function plainTextFromHtml(html: string): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

/** Escape plain text for safe contentEditable seed. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function noteHtmlFromStored(value: string): string {
  if (!value) return "";
  if (!looksLikeHtml(value)) {
    return escapeHtml(value).replace(/\n/g, "<br>");
  }
  return sanitizeNoteHtml(value);
}

/** Strip scripts/attrs; keep basic formatting tags only. */
export function sanitizeNoteHtml(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<(?!\/?(?:b|strong|i|em|br|div|span|p)\b)[^>]*>/gi, "");
  }
  const root = document.createElement("div");
  root.innerHTML = html;

  function clean(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }
    const el = node as HTMLElement;
    if (!ALLOWED.has(el.tagName)) {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      return;
    }
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name === "style" && el.tagName === "SPAN") {
        const size = el.style.fontSize;
        el.removeAttribute("style");
        if (size) el.style.fontSize = size;
        return;
      }
      el.removeAttribute(attr.name);
    });
    [...el.childNodes].forEach(clean);
  }

  [...root.childNodes].forEach(clean);
  return root.innerHTML;
}

// HTML helpers. Copy passed to templates is authored in this repository or
// migrated from the old pages (sanitised by migrate/extract.mjs); every dynamic
// value is still escaped here.

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapes a headline and sets *one word* in the italic accent. */
export function accent(title) {
  return esc(title).replace(/\*([^*]+)\*/g, '<em class="accent">$1</em>');
}

/** JSON for a <script type="application/ld+json"> block (no "</script>" break-out). */
export function jsonBlock(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function ldScript(data) {
  return `<script type="application/ld+json">${jsonBlock(data)}</script>`;
}

/** Root-relative URL for a page slug ("" = home). */
export const pageUrl = (slug) => (slug ? `/${slug}` : "/");

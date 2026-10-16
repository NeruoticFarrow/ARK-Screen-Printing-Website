import { accent, esc, ldScript } from "../lib/html.mjs";
import { imageInfo, picture } from "../lib/images.mjs";
import { crumbs, ctaRow, faqJsonLd, faqList, prose, ratingLink, REASSURANCE, reassure, sectionHead } from "../lib/components.mjs";
import { FACTS, SITE } from "../lib/facts.mjs";
import { icon } from "../lib/icons.mjs";

// Pieces the inner-page templates share.

/** H1 + lead + actions on the left, a photo card on the right (when the page
 *  has one). The H1 is the page's own, migrated unchanged (search). A
 *  landscape or square photo gets the wider column (hero-grid--photo). */
export function pageHero(o) {
  const info = o.photo ? imageInfo(o.photo.src) : null;
  const wide = Boolean(info && info.width / info.height >= 0.9);
  const photo = o.photo
    ? `<figure class="hero-photo-card">${picture(o.photo.src, { alt: o.photo.alt ?? "", sizes: wide ? "(min-width: 960px) 640px, 92vw" : "(min-width: 960px) 560px, 92vw", priority: true })}${o.caption ? `<figcaption>${esc(o.caption)}</figcaption>` : ""}</figure>`
    : "";
  return `<section class="page-hero" aria-labelledby="page-title"><div class="container ${photo ? `hero-grid${wide ? " hero-grid--photo" : ""}` : ""}">
  <div>
    ${o.crumbs ? crumbs(o.crumbs) : ""}
    ${o.eyebrow ? `<p class="kicker eyebrow">${esc(o.eyebrow)}</p>` : ""}
    ${o.noCta ? "" : `<p class="offer-flag">${icon("image")}Free mockup in ${esc(FACTS.mockupWithin)} · no obligation</p>`}
    <h1 id="page-title" class="h1">${accent(o.h1)}</h1>
    ${o.lead ? `<p class="lead">${esc(o.lead)}</p>` : ""}
    ${o.meta ? `<p class="cta-note">${esc(o.meta)}</p>` : ""}
    ${o.noCta ? "" : ctaRow("hero", { onPage: o.onPage })}
    ${o.noCta ? "" : reassure(REASSURANCE)}
    ${o.noRating ? "" : `<div class="hero-proof">${ratingLink("hero_rating")}</div>`}
  </div>
  ${photo}
</div></section>`;
}

/** The page's migrated content blocks, one section each (alternating ground).
 *  A block's FAQ items render as the site's FAQ list. */
/** A section whose one photo leads or trails its text — the area pages'
 *  sections and the embroidery and hats intros, which sat side by side on
 *  the old site. Shown that way again, at the photo's own proportions,
 *  instead of stretched across the page (owner, 2026-10-16); a portrait
 *  photo gets the narrower column. Anything else returns null. */
const PHOTO = String.raw`<figure>[\s\S]*?<\/figure>|<img src="[^"]+" alt="[^"]*">`;
function mediaSplit(html) {
  const lead = html.match(new RegExp(String.raw`^\s*(${PHOTO})([\s\S]+)$`));
  const trail = html.match(new RegExp(String.raw`^([\s\S]+?)(${PHOTO})\s*$`));
  const m = lead ? { fig: lead[1], text: lead[2], flip: true } : trail ? { fig: trail[2], text: trail[1], flip: false } : null;
  if (!m || /<figure|<img/.test(m.text)) return null;
  const src = m.fig.match(/<img src="([^"]+)"/)?.[1];
  const info = src ? imageInfo(src) : null;
  const tall = Boolean(info && info.width / info.height < 0.9);
  const fig = (m.fig.startsWith("<img") ? `<figure>${m.fig}</figure>` : m.fig)
    .replace("<figure>", '<figure class="media-figure">')
    .replace(/<img src="([^"]+)" alt="([^"]*)">/, (_, s, alt) => picture(s, { alt, sizes: tall ? "(min-width: 900px) 420px, 92vw" : "(min-width: 900px) 540px, 92vw" }));
  const text = `<div>${prose(m.text)}</div>`;
  return `<div class="media-split${m.flip ? " media-split--flip" : ""}${tall ? " media-split--tall" : ""}">${m.flip ? fig + text : text + fig}</div>`;
}

export function migratedBlocks(blocks, o = {}) {
  let sand = o.startSand ?? false;
  return blocks.map((b, i) => {
    if (!b.html.replace(/<[^>]+>/g, "").trim() && !b.faq.length) return "";
    const cls = sand ? "section section--sand" : "section";
    sand = !sand;
    const isCallout = /quick-answer|intro-callout/.test(b.kind);
    const body = (!isCallout && mediaSplit(b.html)) || (isCallout ? `<div class="callout">${prose(b.html, { wide: true })}</div>` : prose(b.html, { wide: /cluster|hub|compare|emb|hats|dtf/.test(b.kind) }));
    const faq = b.faq.length ? `<div style="margin-top:28px">${faqList(b.faq.map((f) => ({ q: f.q, html: f.a })))}</div>` : "";
    return `<section class="${cls}" data-block="${esc(b.kind)}"><div class="container">${body}${faq}</div></section>`;
  }).join("");
}

/** The page's own structured data, migrated (deduplicated); an FAQPage is
 *  added only when the page shows FAQs and had none. */
export function pageJsonLd(page, faqItems = []) {
  const blocks = page.jsonLd.filter((j) => !j["@parseError"]);
  const hasFaq = blocks.some((j) => j["@type"] === "FAQPage" || (j["@graph"] ?? []).some((g) => g["@type"] === "FAQPage"));
  return blocks.map((j) => ldScript(j)).join("") + (!hasFaq && faqItems.length ? faqJsonLd(faqItems) : "");
}

export const abs = (src) => (src ? `${SITE.origin}${src.startsWith("/") ? "" : "/"}${src}` : null);

/** "What you get" cards. */
export function pointsSection(points, title = "What you *get*.") {
  return `<section class="section" aria-labelledby="points-title"><div class="container">
  ${sectionHead("points-title", title)}
  <ul class="features">${points.map((p) => `<li class="card feature" data-appear>${p.iconHtml}<h3 class="h4">${esc(p.title)}</h3><p>${esc(p.text)}</p></li>`).join("")}</ul>
</div></section>`;
}

export function usesSection(uses, title = "Who we print *for*.") {
  return `<section class="section--tight"><div class="container"><div class="ticker" style="border-block:1px solid var(--hairline)"><span class="label">${accent(title).replace(/<[^>]+>/g, "")}</span><ul class="chips">${uses.map((u) => `<li class="chip">${esc(u)}</li>`).join("")}</ul></div></div></section>`;
}

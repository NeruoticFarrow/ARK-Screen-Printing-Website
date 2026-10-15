// One-time migration (2026-10-15): reads the hand-built pages in ark-site-review/
// and saves what is unique to each one — head metadata, structured data, the
// hero, the page's own content sections and FAQs — as JSON in
// site-src/content/pages/. The generator renders those into the new design, so
// every page keeps its URL, title, description, H1 and local copy.
//
// Shared blocks (the "Why choose ARK" panel, the review carousel, the
// guarantee banner, the quote iframe) are not extracted: the templates render
// them from site-src/lib/facts.mjs instead.
//
// Refuses to run on generated pages (they carry <meta name="generator">), so
// it can't overwrite the extracted content with the generator's own output.
//
// usage: npm run migrate

import fs from "node:fs";
import path from "node:path";
import { parseHTML } from "linkedom";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const SITE = path.join(ROOT, "ark-site-review");
const OUT = path.join(ROOT, "site-src/content/pages");

const SHARED = new Set(["why-choose-ark", "customer-reviews", "testimonials", "guarantee-banner", "quote-form", "credentials-section", "contact", "typeform-spacer-minimal", "cluster-quote-band", "about-cta", "gallery-cta", "cta-section", "lightbox"]);
const HERO = new Set(["hero", "cluster-hero", "page-header", "page-hero", "gallery-hero"]);
const SKIP_FILES = new Set(["service-areas-old-backup.html"]);

const ALLOWED = new Set(["h2", "h3", "h4", "p", "ul", "ol", "li", "a", "strong", "em", "b", "i", "br", "table", "thead", "tbody", "tr", "th", "td", "img", "figure", "figcaption", "blockquote", "cite"]);
const KICKER = /(kicker|eyebrow|card-index|label|tagline)/;

const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const escText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Internal links lose the .html suffix and any leading "./"; #quote stays. */
function cleanHref(href) {
  if (!href) return null;
  if (/^(https?:|mailto:|tel:|sms:|#)/.test(href)) return href;
  return "/" + href.replace(/^\.?\//, "").replace(/\.html(?=$|#|\?)/, "").replace(/^index$/, "");
}

/** Sanitises a subtree to plain content HTML: allowed tags only, no classes,
 *  styles or scripts; kickers become <p class="kicker">; icon fonts and
 *  buttons that only jump to the old quote form are dropped. */
function sanitize(node) {
  let out = "";
  for (const child of node.childNodes) {
    if (child.nodeType === 3) { out += escText(child.textContent); continue; }
    if (child.nodeType !== 1) continue;
    const tag = child.tagName.toLowerCase();
    const cls = (child.getAttribute("class") || "").toLowerCase();
    if (["script", "style", "noscript", "button", "svg", "iframe", "form"].includes(tag)) continue;
    if (tag === "i" && /\bfa[srb]?\b|fa-/.test(cls)) continue;
    if (tag === "a") {
      const href = cleanHref(child.getAttribute("href"));
      // Calls to action that only jump to the old embedded form: the templates
      // place their own CTAs.
      if (href === "#quote" || /(^|\s)(btn|button|cta)/.test(cls) && (href || "").startsWith("#")) continue;
      if (/(^|\s)btn/.test(cls) && /get-a-quote/.test(href || "")) continue;
      out += `<a href="${escAttr(href || "#")}">${sanitize(child)}</a>`;
      continue;
    }
    if (tag === "img") {
      const src = child.getAttribute("src");
      if (!src) continue;
      out += `<img src="${escAttr(cleanHref(src))}" alt="${escAttr(child.getAttribute("alt") || "")}">`;
      continue;
    }
    if (tag === "h1") { out += `<h2>${sanitize(child)}</h2>`; continue; }
    if ((tag === "p" || tag === "span" || tag === "div") && KICKER.test(cls) && text(child).length < 90) {
      out += `<p class="kicker">${escText(text(child))}</p>`;
      continue;
    }
    if (tag === "details") {
      const q = text(child.querySelector("summary"));
      const answer = child.cloneNode(true);
      answer.querySelector("summary")?.remove();
      out += `<details><summary>${escText(q)}</summary>${sanitize(answer)}</details>`;
      continue;
    }
    if (ALLOWED.has(tag)) { out += `<${tag}>${sanitize(child)}</${tag}>`; continue; }
    // A wrapper (div, article, section, span …): keep its content. Card-like
    // wrappers (an h3 and its text) become <article> so templates can grid them.
    const inner = sanitize(child);
    if ((tag === "article" || /card|item|step|feature|highlight|box/.test(cls)) && child.querySelector("h3,h4")) out += `<article>${inner}</article>`;
    else out += inner;
  }
  return out.replace(/\s{2,}/g, " ");
}

/** FAQ items in either markup the old site used. */
function faqItems(root) {
  const items = [];
  for (const d of root.querySelectorAll("details")) {
    const q = text(d.querySelector("summary"));
    const a = d.cloneNode(true);
    a.querySelector("summary")?.remove();
    if (q) items.push({ q, a: sanitize(a).trim() });
  }
  for (const it of root.querySelectorAll(".faq-item")) {
    const q = text(it.querySelector(".faq-question"));
    const a = it.querySelector(".faq-answer");
    if (q && a) items.push({ q, a: sanitize(a).trim() });
  }
  return items;
}

function jsonLd(d) {
  const seen = new Set();
  const blocks = [];
  for (const s of d.querySelectorAll('script[type="application/ld+json"]')) {
    const raw = s.textContent.trim();
    try {
      const obj = JSON.parse(raw);
      const key = JSON.stringify(obj);
      if (!seen.has(key)) { seen.add(key); blocks.push(obj); }
    } catch {
      blocks.push({ "@parseError": raw.slice(0, 200) });
    }
  }
  return blocks;
}

function hero(section) {
  if (!section) return null;
  const h1 = section.querySelector("h1");
  const paras = [...section.querySelectorAll("p")].filter((p) => !/(eyebrow|kicker|meta)/.test(p.getAttribute("class") || ""));
  const img = section.querySelector("img");
  return {
    eyebrow: text(section.querySelector(".cluster-eyebrow, .eyebrow, .kicker")) || null,
    h1: text(h1),
    lead: paras.map(text).filter(Boolean),
    meta: text(section.querySelector(".cluster-hero-meta")) || null,
    image: img ? { src: cleanHref(img.getAttribute("src")), alt: img.getAttribute("alt") || "" } : null,
    caption: text(section.querySelector("figcaption")) || null,
  };
}

function extract(file) {
  const html = fs.readFileSync(path.join(SITE, file), "utf8");
  if (/<meta name="generator" content="ark-site-src/.test(html)) throw new Error(`${file} is already generated — migration only reads the original pages`);
  const { document: d } = parseHTML(html);
  const meta = (n) => d.querySelector(`meta[name="${n}"]`)?.getAttribute("content") ?? null;
  const main = d.querySelector("main") || d.body;
  const sections = [...main.children].filter((e) => !/^(script|style|footer)$/i.test(e.tagName));
  const first = (el) => ((el.getAttribute("class") || el.tagName.toLowerCase()).trim().split(/\s+/)[0]);
  // The hero is usually main's first section; on the service pages it sits
  // before <main> (embroidery-hero, hats-hero, dtf-hero, hub-hero, compare-hero).
  const h1 = d.querySelector("h1");
  const heroEl = sections.find((s) => HERO.has(first(s))) ?? h1?.closest('[class*="hero"]') ?? null;
  const blocks = [];
  let areas = null;
  let quoteIntro = null;
  for (const s of sections) {
    const kind = first(s);
    if (s === heroEl) continue;
    if (kind === "areas-strip") { areas = sanitize(s).trim(); continue; }
    if (kind === "quote-form" || kind === "cluster-quote-band") {
      const p = [...s.querySelectorAll("p")].map(text).find((t) => t && !/document\.|function/.test(t));
      if (p) quoteIntro = p;
      continue;
    }
    if (SHARED.has(kind)) continue;
    const faq = faqItems(s);
    const clone = s.cloneNode(true);
    clone.querySelectorAll("details, .faq-item").forEach((n) => n.remove());
    const body = sanitize(clone).trim();
    const variant = /soft|sand|alt|dark/.exec(s.getAttribute("class") || "")?.[0] ?? null;
    blocks.push({ kind, variant, html: body, faq });
  }
  return {
    file,
    slug: file.replace(/\.html$/, ""),
    title: text(d.querySelector("title")),
    description: meta("description"),
    canonical: d.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
    robots: meta("robots"),
    jsonLd: jsonLd(d),
    hero: hero(heroEl),
    blocks,
    areas,
    quoteIntro,
  };
}

const files = fs.readdirSync(SITE).filter((f) => f.endsWith(".html") && !SKIP_FILES.has(f));
fs.mkdirSync(OUT, { recursive: true });
for (const f of files) {
  const data = extract(f);
  fs.writeFileSync(path.join(OUT, `${data.slug}.json`), JSON.stringify(data, null, 2) + "\n");
}
console.log(`extracted ${files.length} pages → site-src/content/pages/`);

// Reviews (the owner's picks, already published on the site): name, date,
// words and photo, from the testimonials page.
{
  const { document: d } = parseHTML(fs.readFileSync(path.join(SITE, "testimonials.html"), "utf8"));
  const cards = [...d.querySelectorAll(".testimonial-card")];
  const reviews = cards.map((c) => ({
    name: text(c.querySelector("h2, h3")),
    date: text(c.querySelector(".testimonial-source")).replace(/^.*?•\s*/, "") || null,
    quote: text(c.querySelector(".testimonial-content")).replace(/^["“]\s*|\s*["”]$/g, ""),
    photo: cleanHref(c.querySelector("img")?.getAttribute("src")),
  })).filter((r) => r.name && r.quote);
  fs.writeFileSync(path.join(ROOT, "site-src/content/reviews.json"), JSON.stringify(reviews, null, 2) + "\n");
  console.log(`reviews: ${reviews.length}`);
}

// The thank-you page's conversion snippets, kept byte for byte.
{
  const { document: d } = parseHTML(fs.readFileSync(path.join(SITE, "thank-you.html"), "utf8"));
  const snippets = [...d.querySelectorAll("script:not([src])")].map((s) => s.textContent.trim()).filter((t) => /gtag\('event',\s*'conversion'/.test(t));
  fs.writeFileSync(path.join(ROOT, "site-src/content/thank-you-conversions.json"), JSON.stringify(snippets, null, 2) + "\n");
  console.log(`thank-you conversion snippets: ${snippets.length}`);
}

// The gallery's images in their published order.
{
  const { document: d } = parseHTML(fs.readFileSync(path.join(SITE, "gallery.html"), "utf8"));
  const imgs = [...d.querySelectorAll(".gallery-section img")].map((i) => ({ src: cleanHref(i.getAttribute("src")), alt: i.getAttribute("alt") || "" }));
  fs.writeFileSync(path.join(ROOT, "site-src/content/gallery.json"), JSON.stringify(imgs, null, 2) + "\n");
  console.log(`gallery images: ${imgs.length}`);
}

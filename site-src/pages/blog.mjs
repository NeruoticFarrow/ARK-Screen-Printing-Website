import fs from "node:fs";
import path from "node:path";
import { parseHTML } from "linkedom";
import { FACTS, SHOP, SITE } from "../lib/facts.mjs";
import { accent, esc, ldScript } from "../lib/html.mjs";
import { icon } from "../lib/icons.mjs";
import { crumbs, ctaBand, finalCta, sectionHead, textLink } from "../lib/components.mjs";
import { abs } from "./parts.mjs";

// The blog: /blog and /blog/<slug>, from the articles Ryze AI sends to
// netlify/functions/ryze-webhook.mjs (one JSON file each in
// content/blog/). The pages are written at every build and not committed
// (.gitignore), since an article lands in the repo without a build.
//
// Article bodies come from outside this repository, so they are cleaned here:
// only text, links, lists, tables, images and video embeds survive, and the
// article's own H1 becomes an H2 (the page has one H1, its title).

const BLOG_URL = `${SITE.origin}/blog`;

/** Articles to show, newest first. Anything not published (draft, archived,
 *  deleted…) stays in the repo but off the site. */
export function loadPosts(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))
    .filter((p) => p.slug && p.title && (!p.status || /^(publish|live)/i.test(p.status)))
    .map((p) => ({ ...p, body: cleanBody(p.body_html || markdownToHtml(p.body_markdown ?? ""), p.title) }))
    .sort((a, b) => String(b.published_at ?? "").localeCompare(String(a.published_at ?? "")));
}

const date = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Denver" });
};
const isoDate = (iso) => (iso && !Number.isNaN(new Date(iso).getTime()) ? new Date(iso).toISOString() : undefined);
const minutes = (html) => Math.max(1, Math.round(html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length / 230));
const imageSrc = (p) => p.image?.src ?? p.image?.url ?? null;
const description = (p) => p.meta_description || p.excerpt || "";

function cover(p, o = {}) {
  const src = imageSrc(p);
  if (!src) return "";
  const loading = o.priority ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<img src="${esc(src)}" alt="${esc(p.image.alt ?? "")}"${loading} decoding="async">`;
}

function postCard(p, level = "h2") {
  return `<li><a class="card blog-card" href="/blog/${esc(p.slug)}" data-appear>
  ${imageSrc(p) ? `<span class="blog-card-img">${cover(p)}</span>` : ""}
  <span class="blog-card-body">
    ${p.published_at ? `<span class="blog-meta">${esc(date(p.published_at))}</span>` : ""}
    <${level} class="h4">${esc(p.title)}</${level}>
    ${p.excerpt ? `<span class="blog-card-excerpt">${esc(p.excerpt)}</span>` : ""}
    <span class="text-link">Read the article ${icon("arrowRight")}</span>
  </span>
</a></li>`;
}

const breadcrumbLd = (items) => ldScript({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
});
const publisher = { "@type": "Organization", name: SHOP.name, url: SITE.origin, logo: { "@type": "ImageObject", url: `${SITE.origin}/assets/brand/ark-logo-120.png` } };

export function renderBlogIndex(posts) {
  const hero = `<section class="page-hero" aria-labelledby="page-title"><div class="container">
  ${crumbs([{ name: "Home", href: "/" }, { name: "Blog" }])}
  <h1 id="page-title" class="h1">${accent("Custom printing, *explained*.")}</h1>
  <p class="lead">Guides and straight answers on screen printing, DTF, embroidery and custom apparel from our ${esc(SHOP.city)} print shop.</p>
</div></section>`;
  const list = posts.length
    ? `<ul class="blog-grid">${posts.map((p) => postCard(p)).join("")}</ul>`
    : `<p class="lead">The first articles are on their way. Until then, <a href="${esc(SHOP.smsHref)}">text ${esc(SHOP.phoneDisplay)}</a> with any question — a real person at ARK answers.</p>`;
  const grid = `<section class="section"><div class="container">${list}</div></section>`;
  const closing = finalCta("Ready to print *yours*?", `Tell us what you need. ${FACTS.mockupPromise}`);
  const jsonLd = ldScript({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SHOP.name} Blog`,
    url: BLOG_URL,
    publisher,
    blogPost: posts.slice(0, 20).map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${BLOG_URL}/${p.slug}`, datePublished: isoDate(p.published_at) })),
  }) + breadcrumbLd([{ name: "Home", url: `${SITE.origin}/` }, { name: "Blog", url: BLOG_URL }]);
  return {
    title: `Blog: Screen Printing & Custom Apparel Guides | ${SHOP.name}`,
    description: `Guides and answers on screen printing, DTF, embroidery and custom shirts from ${SHOP.name} in ${SHOP.city}, ${SHOP.region}.`,
    canonical: BLOG_URL,
    chrome: "full",
    current: "blog",
    page: "blog",
    jsonLd,
    main: hero + grid + closing,
  };
}

export function renderBlogPost(post, posts) {
  const url = `${BLOG_URL}/${post.slug}`;
  const published = date(post.published_at);
  const updated = post.updated_at && date(post.updated_at) !== published ? date(post.updated_at) : "";
  const meta = [published, updated && `Updated ${updated}`, `${minutes(post.body)} min read`].filter(Boolean).join(" · ");
  const hero = `<section class="page-hero blog-hero" aria-labelledby="page-title"><div class="container narrow">
  ${crumbs([{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, { name: post.title }])}
  <p class="blog-meta">${esc(meta)}</p>
  <h1 id="page-title" class="h1">${esc(post.title)}</h1>
  ${post.excerpt ? `<p class="lead">${esc(post.excerpt)}</p>` : ""}
</div></section>`;
  const image = imageSrc(post) ? `<div class="container blog-cover-wrap"><figure class="blog-cover">${cover(post, { priority: true })}</figure></div>` : "";
  const body = `<section class="section"><div class="container narrow"><div class="prose blog-body">${post.body}</div></div></section>`;
  const more = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const related = more.length
    ? `<section class="section section--sand" aria-labelledby="related-title"><div class="container">${sectionHead("related-title", "More from the *blog*.", undefined, { aside: textLink("/blog", "All articles", "blog_all") })}<ul class="blog-grid">${more.map((p) => postCard(p, "h3")).join("")}</ul></div></section>`
    : "";
  const closing = finalCta("Let's print *yours*.", `Tell us what you need. ${FACTS.mockupPromise}`);
  const jsonLd = ldScript({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: description(post) || undefined,
    image: imageSrc(post) ? [imageSrc(post).startsWith("/") ? abs(imageSrc(post)) : imageSrc(post)] : undefined,
    datePublished: isoDate(post.published_at),
    dateModified: isoDate(post.updated_at) ?? isoDate(post.published_at),
    keywords: post.primary_keyword || undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    author: { "@type": "Organization", name: SHOP.name, url: SITE.origin },
    publisher,
  }) + breadcrumbLd([{ name: "Home", url: `${SITE.origin}/` }, { name: "Blog", url: BLOG_URL }, { name: post.title, url }]);
  const head = [
    isoDate(post.published_at) && `<meta property="article:published_time" content="${esc(isoDate(post.published_at))}">`,
    isoDate(post.updated_at) && `<meta property="article:modified_time" content="${esc(isoDate(post.updated_at))}">`,
  ].filter(Boolean).join("\n");
  const ogImage = imageSrc(post) ? (imageSrc(post).startsWith("/") ? abs(imageSrc(post)) : imageSrc(post)) : null;
  return {
    title: post.meta_title || `${post.title} | ${SHOP.name}`,
    description: description(post),
    canonical: url,
    ogType: "article",
    ogImage,
    chrome: "full",
    current: "blog",
    page: "blog-post",
    jsonLd,
    head,
    main: `<article>${hero}${image}${body}</article>` + ctaBand("blog_post") + related + closing,
  };
}

/** The sitemap of the blog's pages (robots.txt lists it beside the main one). */
export function blogSitemap(posts) {
  const url = (loc, lastmod) => `  <url>\n    <loc>${esc(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : ""}\n  </url>`;
  const newest = posts.map((p) => isoDate(p.updated_at) ?? isoDate(p.published_at)).filter(Boolean).sort().pop();
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[url(BLOG_URL, newest), ...posts.map((p) => url(`${BLOG_URL}/${p.slug}`, isoDate(p.updated_at) ?? isoDate(p.published_at)))].join("\n")}
</urlset>
`;
}

// ── Cleaning the article body.

const KEEP_TAGS = new Set("p br hr h2 h3 h4 h5 h6 strong b em i u s del ins mark small sub sup a ul ol li blockquote q cite code pre kbd figure figcaption img picture source table thead tbody tfoot tr th td caption dl dt dd abbr time span div section iframe".split(" "));
const DROP_WITH_CONTENT = new Set("script style noscript template object embed form input button select textarea link meta base svg math canvas audio video head title".split(" "));
const ATTRS = { "*": ["id", "title"], a: ["href", "target", "rel"], img: ["src", "alt", "width", "height", "srcset", "sizes"], source: ["srcset", "type", "media", "sizes"], th: ["colspan", "rowspan", "scope"], td: ["colspan", "rowspan"], ol: ["start", "reversed", "type"], time: ["datetime"], iframe: ["src", "title", "allow", "allowfullscreen"] };
const EMBEDS = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com|www\.loom\.com)\//;
// Ids the page frame already uses; an article id that repeats one is dropped.
const TAKEN_IDS = new Set(["main", "site-menu", "quote", "page-title", "related-title", "final-cta-title"]);
const safeUrl = (u, o = {}) => {
  const v = String(u ?? "").trim();
  if (/^(https?:|mailto:|tel:|sms:)/i.test(v) || v.startsWith("/") || v.startsWith("#")) return !o.image || !/^(mailto|tel|sms):/i.test(v);
  return !/^[a-z][a-z0-9+.-]*:/i.test(v); // relative URLs are fine; javascript:, data: … are not
};

export function cleanBody(html, title) {
  const { document } = parseHTML(`<!doctype html><html><body><div id="ryze-root">${html}</div></body></html>`);
  const root = document.getElementById("ryze-root");
  const rename = (el, tag) => {
    const next = document.createElement(tag);
    while (el.firstChild) next.appendChild(el.firstChild);
    for (const a of [...el.attributes]) next.setAttribute(a.name, a.value);
    el.replaceWith(next);
    return next;
  };

  // A first heading that repeats the title is the page's H1 already.
  const first = root.querySelector("h1, h2");
  if (first && first.textContent.trim().toLowerCase() === String(title).trim().toLowerCase()) first.remove();

  for (const el of [...root.querySelectorAll("*")]) {
    if (!el.isConnected) continue;
    let tag = el.tagName.toLowerCase();
    if (DROP_WITH_CONTENT.has(tag)) { el.remove(); continue; }
    if (tag === "h1") { tag = "h2"; }
    if (tag === "iframe" && !EMBEDS.test(el.getAttribute("src") ?? "")) { el.remove(); continue; }
    if (!KEEP_TAGS.has(tag) && tag !== "h1") { el.replaceWith(...el.childNodes); continue; }
    const node = el.tagName.toLowerCase() === tag ? el : rename(el, tag);
    const allowed = new Set([...ATTRS["*"], ...(ATTRS[tag] ?? [])]);
    for (const a of [...node.attributes]) if (!allowed.has(a.name.toLowerCase())) node.removeAttribute(a.name);
    for (const a of ["href", "src"]) if (node.hasAttribute(a) && !safeUrl(node.getAttribute(a), { image: a === "src" })) node.removeAttribute(a);
    for (const a of ["srcset"]) if (node.hasAttribute(a) && /javascript:|data:/i.test(node.getAttribute(a))) node.removeAttribute(a);
    if (node.id && TAKEN_IDS.has(node.id)) node.removeAttribute("id");
    if (tag === "a") {
      const href = node.getAttribute("href") ?? "";
      // Links to the site itself stay on it, root-relative.
      if (href.startsWith(SITE.origin)) node.setAttribute("href", href.slice(SITE.origin.length) || "/");
      if (/^https?:/i.test(node.getAttribute("href") ?? "")) node.setAttribute("rel", "noopener");
      if (node.getAttribute("target") && node.getAttribute("target") !== "_blank") node.removeAttribute("target");
    }
    if (tag === "img") {
      if (!node.getAttribute("src")) { node.remove(); continue; }
      node.setAttribute("loading", "lazy");
      node.setAttribute("decoding", "async");
      if (!node.hasAttribute("alt")) node.setAttribute("alt", "");
    }
    if (tag === "iframe") {
      node.setAttribute("loading", "lazy");
      if (!node.getAttribute("title")) node.setAttribute("title", "Embedded video");
      const wrap = document.createElement("div");
      wrap.setAttribute("class", "blog-embed");
      node.replaceWith(wrap);
      wrap.appendChild(node);
    }
    if (tag === "table") {
      const wrap = document.createElement("div");
      wrap.setAttribute("class", "table-scroll");
      node.replaceWith(wrap);
      wrap.appendChild(node);
    }
  }
  // Comments can hide conditional markup; nothing in an article needs them.
  const walker = document.createTreeWalker(root, 128 /* NodeFilter.SHOW_COMMENT */);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => c.remove());
  return root.innerHTML.trim();
}

/** Only for an article that arrives without body_html: headings, paragraphs,
 *  lists, links, bold and italic. Everything is escaped first. */
export function markdownToHtml(md) {
  const inline = (s) => esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => `<a href="${href}">${text}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return String(md).replace(/\r\n/g, "\n").split(/\n{2,}/).map((block) => {
    const b = block.trim();
    if (!b) return "";
    const h = b.match(/^(#{1,6})\s+(.*)$/);
    if (h) { const level = Math.min(Math.max(h[1].length, 2), 4); return `<h${level}>${inline(h[2])}</h${level}>`; }
    const lines = b.split("\n");
    if (lines.every((l) => /^\s*[-*+]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*+]\s+/, ""))}</li>`).join("")}</ul>`;
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`;
    if (lines.every((l) => /^>\s?/.test(l))) return `<blockquote><p>${inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "))}</p></blockquote>`;
    return `<p>${inline(lines.join(" "))}</p>`;
  }).join("\n");
}

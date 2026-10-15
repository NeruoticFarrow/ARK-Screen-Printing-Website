import fs from "node:fs";
import { FACTS, GOOGLE, SERVICES, SHOP, SITE } from "./facts.mjs";
import { accent, esc, ldScript } from "./html.mjs";
import { icon } from "./icons.mjs";
import { gbpData } from "./gbp-data.mjs";
import { imageInfo, picture } from "./images.mjs";
import { PHOTOS } from "./media.mjs";

// Building blocks, in the Verdara language: Fraunces headlines with one italic
// accent word, pill buttons, 20 px cards and colour-block tiles, the ARK seal
// on big tiles. Pure functions of their inputs; every value is escaped.

// Reviews: the Business Profile's own, newest first and every rating, when the
// weekly sync is on (sync/gbp-sync.mjs); otherwise the owner's published picks.
const PICKS = JSON.parse(fs.readFileSync(new URL("../content/reviews.json", import.meta.url), "utf8"))
  // Relative dates ("2 days ago") were true when pasted and aren't now.
  .map((r) => ({ ...r, rating: 5, date: r.date && !/ago|google/i.test(r.date) ? r.date : null }));
const LIVE = gbpData();
export const REVIEWS = LIVE?.reviews?.length ? LIVE.reviews : PICKS;
/** The Business Profile's own photos (newest first), when the sync is on. */
export const GBP_PHOTOS = LIVE?.photos ?? [];
const DATE = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const reviewDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d ?? "") ? DATE.format(new Date(`${d}T00:00:00Z`)) : d);
const SEAL = `<img class="seal" src="/assets/brand/ark-seal.png" width="300" height="304" alt="" loading="lazy" decoding="async">`;

export function sectionHead(id, title, text, o = {}) {
  const tag = o.level ?? "h2";
  return `<div class="section-head"><div>${o.kicker ? `<p class="kicker">${esc(o.kicker)}</p>` : ""}<${tag} id="${esc(id)}" class="${tag === "h1" ? "h1" : "h2"}">${accent(title)}</${tag}>${text ? `<p>${esc(text)}</p>` : ""}</div>${o.aside ?? ""}</div>`;
}

export function textLink(href, label, placement) {
  return `<a class="text-link" href="${esc(href)}"${placement ? ` data-cta="${esc(placement)}"` : ""}>${esc(label)} ${icon("arrowRight")}</a>`;
}

/** The primary action: the quote form (on the page when it has one). */
export function quoteButton(placement, o = {}) {
  const href = o.onPage ? "#quote" : "/get-a-quote#quote";
  return `<a class="btn ${o.onDark ? "btn--accent" : "btn--primary"} btn--lg" href="${href}" data-cta="${esc(placement)}">${esc(o.label ?? "Get an instant quote")} ${icon("arrowRight")}</a>`;
}

export function callButton(placement, o = {}) {
  return `<a class="btn btn--ghost btn--lg" href="${esc(SHOP.phoneHref)}" data-cta="${esc(placement)}">${icon("phone")}${esc(o.label ?? `Call or text ${SHOP.phoneDisplay}`)}</a>`;
}

export function ctaRow(placement, o = {}) {
  return `<div class="cta-row">${quoteButton(placement, o)}${o.noCall ? "" : callButton(`${placement}_call`)}</div>${o.note ? `<p class="cta-note">${o.note}</p>` : ""}`;
}

export function reassure(lines) {
  return `<ul class="reassure">${lines.map((l) => `<li>${icon("check")}${esc(l)}</li>`).join("")}</ul>`;
}

/** The risk reducers under every primary CTA — each one true (facts.mjs). */
export const REASSURANCE = ["No minimum order", `A reply within ${FACTS.replyWithin}`, "You approve a proof before we print"];

export function stars(className = "stars", value = GOOGLE.rating) {
  return `<span class="${className}" aria-hidden="true">${Array.from({ length: Math.round(value) }, () => icon("starFill")).join("")}</span>`;
}

export function ratingLink(placement) {
  return `<a class="rating" href="${esc(GOOGLE.url)}" target="_blank" rel="noopener" data-cta="${esc(placement)}">${stars()}<span><b>${GOOGLE.rating.toFixed(1)} on Google</b> · ${GOOGLE.count} reviews<span class="visually-hidden"> (opens Google)</span></span></a>`;
}

/** Rating, address, hours and call/text: local proof in plain sight. */
export function localStrip(placement = "strip") {
  return `<div class="local-strip">
  ${ratingLink(`${placement}_rating`)}
  <span>${icon("mapPin")}<a href="${esc(SHOP.mapsUrl)}" target="_blank" rel="noopener" data-cta="${esc(placement)}_map">${esc(SHOP.street)}, ${esc(SHOP.city)}<span class="visually-hidden"> (opens Google Maps)</span></a></span>
  <span>${icon("clock")}${esc(SHOP.hours)}</span>
  <span>${icon("phone")}<a href="${esc(SHOP.phoneHref)}" data-cta="${esc(placement)}_call">Call</a> or <a href="${esc(SHOP.smsHref)}" data-cta="${esc(placement)}_text">text</a> ${esc(SHOP.phoneDisplay)}</span>
</div>`;
}

/* ── Doodles: hand-drawn marks in the logo's colours, decoration only. */
const DOODLES = {
  burst: `<svg viewBox="0 0 100 100" focusable="false"><g fill="currentColor">${Array.from({ length: 8 }, (_, k) => `<ellipse cx="50" cy="25" rx="9" ry="23" transform="rotate(${k * 45} 50 50)"/>`).join("")}<circle cx="50" cy="50" r="13"/></g></svg>`,
  loop: `<svg viewBox="0 0 160 90" fill="none" focusable="false"><path pathLength="1" d="M5 72C30 22 64 8 73 34s-31 40-26 14S105 15 155 28" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  strokes: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" focusable="false"><path pathLength="1" d="M16 48 56 14"/><path pathLength="1" d="M22 68 74 26"/><path pathLength="1" d="M36 84 86 44"/></svg>`,
};
export function doodle(kind, className = "", attrs = "") {
  return `<span class="doodle doodle--${kind}${className ? ` ${className}` : ""}" aria-hidden="true"${attrs}>${DOODLES[kind]}</span>`;
}
const layer = (depth, order, extra = "") => ` data-depth="${depth}" style="--i:${order}"${extra}`;

function sticker(attrs) {
  return `<span class="sticker" aria-hidden="true"${attrs}><svg viewBox="0 0 120 120" focusable="false"><defs><path id="sticker-ring" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0"/></defs><circle cx="60" cy="60" r="59" class="sticker-disc"/><circle cx="60" cy="60" r="31" class="sticker-core"/><text class="sticker-text"><textPath href="#sticker-ring" textLength="278" lengthAdjust="spacingAndGlyphs">ARK SCREEN PRINTING · COLORADO SPRINGS ·</textPath></text><image href="/assets/brand/ark-logo-120.png" x="38" y="38" width="44" height="44"/></svg></span>`;
}

function floatChip(name, text, className, attrs) {
  return `<span class="float-chip ${className}"${attrs}>${icon(name)}<span>${esc(text)}</span></span>`;
}

/** How an order goes, on a card in front of the hero photo. Every line is
 *  also said in the page's copy, so the card can stay presentational. */
function orderCard() {
  return `<div class="order-card"${layer(-0.04, 11)}>
  <span class="oc-title">How your order goes <span class="badge badge--sky">4 steps</span></span>
  <ol>
    <li>${icon("chatCircleText")}<span><b>Quote</b> — about two minutes</span></li>
    <li>${icon("phone")}<span><b>We confirm</b> — within ${esc(FACTS.replyWithin)}</span></li>
    <li>${icon("sealCheck")}<span><b>Proof</b> — you approve it first</span></li>
    <li>${icon("printer")}<span><b>Printed here</b> — pick up or we ship</span></li>
  </ol>
</div>`;
}

/** The hero's right side: a navy tile with a real photo from the press, over
 *  a collage of real prints, doodles, the shop's sticker and floating facts.
 *  Settles in once and drifts with the scroll on desktop (site.js); still for
 *  prefers-reduced-motion. Every picture is ARK's own work. */
export function heroArt() {
  const card = (p) => picture(p.src, { alt: "", sizes: "180px" });
  return `<div class="hero-art" data-parallax>
  <div class="collage collage--back" aria-hidden="true">
    <span class="cl cl--a"${layer(0.3, 1)}>${card(PHOTOS.team)}</span>
    <span class="cl cl--b"${layer(0.14, 2)}>${card(PHOTOS.business)}</span>
    <span class="cl cl--c"${layer(0.38, 3)}>${card(PHOTOS.brandTee)}</span>
    <span class="cl cl--d"${layer(0.46, 4)}>${card(PHOTOS.illustration)}</span>
    ${doodle("burst", "cl-burst", layer(0.24, 5))}
    ${doodle("loop", "cl-loop", layer(0.1, 6))}
  </div>
  <div class="hero-tile on-dark">
    ${SEAL}
    <div class="hero-photo">${picture(PHOTOS.press.src, { alt: PHOTOS.press.alt, sizes: "(min-width: 960px) 380px, 80vw", priority: true })}</div>
    <span class="chip chip--tan hero-tag">${icon("printer")}On our press in ${esc(SHOP.city)}</span>
  </div>
  <div class="collage collage--front" aria-hidden="true">
    ${doodle("strokes", "cl-strokes", layer(0.18, 7))}
    ${floatChip("tShirt", "No minimum order", "fc-a", layer(0.08, 8))}
    ${floatChip("sealCheck", "Proof before we print", "fc-b", layer(0.05, 9))}
    ${sticker(layer(0.12, 10, ' data-spin="0.12"'))}
  </div>
  ${orderCard()}
</div>`;
}

/** The rules, stated plainly with the reason (navy tile, big numbers). */
export function rulesTile(id = "rules-title", o = {}) {
  const stats = [
    { figure: "1+", label: "pieces: no minimum order (DTF, full colour)" },
    { figure: `${FACTS.screenFrom}+`, label: "pieces: screen printing available" },
    { figure: `${FACTS.screenBestValueFrom}+`, label: "pieces: screen printing's best value" },
    { figure: FACTS.turnaround.screen.replace(" business days", ""), label: "business days: most screen-print orders" },
  ];
  return `<div class="tile tile--navy on-dark" data-appear>
  ${SEAL}
  <div class="rule">
    <div>
      <h2 id="${esc(id)}" class="h2">${accent(o.title ?? "One shirt or a thousand — *no* minimum.")}</h2>
      <p>Screen printing needs a screen made for each ink colour, so it pays off as the quantity grows. DTF needs no screens, so it's the better buy for a handful of shirts or full-colour art. Tell us your quantity and we'll recommend the cheaper method — you don't need to know which one you want.</p>
      <div class="cta-row">${o.onPage ? `<a class="btn btn--accent" href="#quote" data-cta="rules_quote">Get a quote ${icon("arrowRight")}</a>` : `<a class="btn btn--accent" href="/get-a-quote#quote" data-cta="rules_quote">Get a quote ${icon("arrowRight")}</a>`}${textLink("/dtf-vs-screen-printing", "DTF vs screen printing", "rules_compare")}</div>
    </div>
    <ul class="stats">${stats.map((s) => `<li><span class="stat-figure">${esc(s.figure)}</span><span class="stat-label">${esc(s.label)}</span></li>`).join("")}</ul>
  </div>
</div>`;
}

/** The named process, as the thank-you page describes it: request → we
 *  confirm (a call, or an email if we miss you) → you approve the proof →
 *  we invoice and print. The proof comes before anything is printed. */
export const PROCESS = [
  { title: "Request your quote", text: "Tell us the garment, the quantity, where it's printed and the date you need it. The quote form takes about two minutes — or call or text and talk it through." },
  { title: "We confirm the details", text: `Within ${FACTS.replyWithin} we call — or email if we miss you — to confirm sizes, artwork and timing.` },
  { title: "Approve your proof", text: "You see your design on the garment, with the price, before anything is printed." },
  { title: "Printed here, then it's yours", text: `Printed in our ${SHOP.city} shop — most screen-print orders in ${FACTS.turnaround.screen}. Pick up on ${SHOP.street.replace(/, Suite.*/, "")} or we ship.` },
];

export function stepsList(steps = PROCESS) {
  return `<ol class="steps">${steps.map((s, i) => `<li class="step" data-appear><span class="step-num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join("")}</ol>`;
}

export function serviceTiles(lines) {
  return `<ul class="service-tiles">${SERVICES.map((s) => `<li><a class="service-tile" href="/${s.slug}" data-cta="service_${esc(s.slug)}" data-appear>${icon(s.icon)}<h3>${esc(s.label)}</h3><p>${esc(lines[s.slug] ?? "")}</p><span class="text-link">See ${esc(s.label.toLowerCase())} ${icon("arrowRight")}</span></a></li>`).join("")}</ul>`;
}

/** Real Google reviews the owner published on the site (source and date shown). */
export function reviewsGrid(limit = REVIEWS.length) {
  const avatar = (r) => r.photo
    ? `<img src="${esc(encodeURI(r.photo))}" width="40" height="40" alt="" loading="lazy" decoding="async">`
    : `<span class="avatar" aria-hidden="true">${esc((r.name || "?").trim().charAt(0).toUpperCase())}</span>`;
  return `<ul class="reviews">${REVIEWS.slice(0, limit).map((r) => `<li class="review" data-appear>
  ${stars("stars", r.rating ?? 5)}<span class="visually-hidden">Rated ${r.rating ?? 5} out of 5.</span>
  <blockquote>“${esc(r.quote)}”</blockquote>
  <footer>${avatar(r)}<span><b>${esc(r.name)}</b>Google review${r.date ? ` · ${esc(reviewDate(r.date))}` : ""}</span></footer>
</li>`).join("")}</ul>${LIVE ? `<p class="reviews-note">The most recent reviews from our Google Business Profile, every rating, updated ${esc(reviewDate(LIVE.fetchedAt.slice(0, 10)))}.</p>` : ""}`;
}

export function proofSection(id, title, o = {}) {
  return `<div class="proof">
  <div class="tile tile--sand score" data-appear>
    ${SEAL.replace('class="seal"', 'class="seal seal--dark"')}
    <span class="label">${esc(SHOP.name)} on Google</span>
    <span class="score-figure">${GOOGLE.rating.toFixed(1)}</span>
    ${stars()}
    <p>From ${GOOGLE.count} Google reviews of the shop. Every one is a real customer.${GOOGLE.live ? " Synced from Google each week." : ""}</p>
    <a class="btn btn--ghost" href="${esc(GOOGLE.url)}" target="_blank" rel="noopener" data-cta="reviews_google">Read them on Google ${icon("arrowUpRight")}<span class="visually-hidden"> (opens Google)</span></a>
  </div>
  <div>
    <h2 id="${esc(id)}" class="h3" style="margin-bottom:18px">${accent(title)}</h2>
    ${reviewsGrid(o.limit ?? 3)}
    <p style="margin-top:18px">${textLink("/testimonials", "All reviews", "reviews_all")}</p>
  </div>
</div>`;
}

export function ownerSection(id, o = {}) {
  return `<div class="owner">
  <figure class="photo">${picture(PHOTOS.owner.src, { alt: PHOTOS.owner.alt, sizes: "(min-width: 960px) 480px, 90vw" })}</figure>
  <div>
    <p class="kicker">Meet the printer</p>
    <h2 id="${esc(id)}" class="h2">${accent(o.title ?? "You'll talk to the person who *prints* it.")}</h2>
    <p class="lead" style="margin-top:18px">ARK is a small, owner-operated shop on ${esc(SHOP.street.replace(/, Suite.*/, ""))}. ${esc(SHOP.owner)} quotes your job, checks your art, pulls the prints and answers the phone — since ${SHOP.since}.</p>
    <ul class="checklist" style="margin-top:22px">
      <li>${icon("sealCheck")}<span><b>Licensed and insured</b><small>A fully licensed Colorado business with liability insurance.</small></span></li>
      <li>${icon("palette")}<span><b>Premium inks</b><small>${esc(FACTS.inks)}.</small></span></li>
      <li>${icon("shieldCheck")}<span><b>Satisfaction guarantee</b><small>${esc(FACTS.guarantee)}</small></span></li>
    </ul>
    ${o.more === false ? "" : `<p style="margin-top:22px">${textLink("/about", "The ARK story", "owner_about")}</p>`}
  </div>
</div>`;
}

const CATEGORY_ALT = {
  PRODUCT: "A recent print from ARK Screen Printing",
  AT_WORK: "At work in the ARK Screen Printing shop",
  TEAMS: "The team at ARK Screen Printing",
  INTERIOR: "Inside the ARK Screen Printing shop",
  EXTERIOR: "The ARK Screen Printing shop from outside",
};
/** A Business Profile photo as a gallery item, described by the owner's own
 *  caption or, failing that, by its Google category. */
const gbpItem = (p) => ({ src: p.src, alt: p.alt || CATEGORY_ALT[p.category] || "Recent work from ARK Screen Printing" });

/** Real work: the newest Business Profile photos first (when synced), then
 *  the curated photos, without repeats. */
export function recentWork(curated, n = Infinity) {
  const seen = new Set();
  return [...GBP_PHOTOS.map(gbpItem), ...curated.map((c) => (typeof c === "string" ? { src: c, alt: "" } : c))]
    .filter((it) => !seen.has(it.src) && seen.add(it.src))
    .slice(0, n);
}

export function galleryGrid(items, o = {}) {
  return `<ul class="gallery">${items.map((it) => {
    const src = typeof it === "string" ? it : it.src;
    const alt = typeof it === "string" ? "" : it.alt;
    const pic = picture(src, { alt, sizes: "(min-width: 900px) 400px, 50vw" });
    const full = imageInfo(src)?.variants?.at(-1)?.file ?? src;
    return `<li data-appear>${o.lightbox ? `<a href="${esc(full)}" data-lightbox data-alt="${esc(alt)}">${pic}</a>` : pic}</li>`;
  }).join("")}</ul>${o.lightbox ? `<dialog class="lightbox" data-lightbox-dialog aria-label="Photo"><img src="" alt=""><div class="lightbox-bar"><span data-lightbox-caption></span><button type="button" data-lightbox-close>${icon("x")}<span class="visually-hidden">Close</span></button></div></dialog>` : ""}`;
}

/** Who it's for, as a moving strip: read once (the repeat is aria-hidden),
 *  moves only once site.js has wired the pause button (WCAG 2.2.2), pauses on
 *  hover and focus, and stays still for prefers-reduced-motion. */
export function ticker(label, items) {
  const li = (hidden) => items.map((a) => `<li class="chip"${hidden ? ' aria-hidden="true"' : ""}>${esc(a)}</li>`).join("");
  return `<div class="ticker" data-ticker>
  <span class="label">${esc(label)}</span>
  <div class="ticker-window"><ul class="ticker-track" aria-label="${esc(label)}">${li(false)}${li(true)}</ul></div>
  <button class="ticker-toggle" type="button" data-ticker-toggle aria-pressed="false" hidden>${icon("pause", "icon i-pause")}${icon("play", "icon i-play")}<span class="visually-hidden">Pause the moving list</span></button>
</div>`;
}

/** Local pages as pill links (current one marked). */
export function areasList(areas, current) {
  return `<ul class="areas">${areas.map((a) => `<li><a href="/${esc(a.slug)}"${a.slug === current ? ' aria-current="page"' : ""}>${esc(a.name)}</a></li>`).join("")}</ul>`;
}

export function faqList(items, o = {}) {
  return `<div class="faq">${items.map((it, i) => `<details${o.open ? " open" : ""}><summary>${esc(it.q)}${icon("plus", "icon i-plus")}${icon("minus", "icon i-minus")}</summary><div class="answer">${it.html ?? it.a.map((p) => `<p>${p}</p>`).join("")}</div></details>`).join("")}</div>`;
}

export function faqJsonLd(items) {
  const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
  return ldScript({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: text(it.html ?? it.a.join(" ")) } })) });
}

/** The quote form (ark-quote-form, embedded) beside what happens next and the
 *  phone. site.js passes ad click IDs and UTM tags through to the form. */
export function quoteBand(o = {}) {
  return `<section class="section${o.plain ? "" : " section--sand"}" id="quote" aria-labelledby="quote-title"><div class="container">
  <div class="quote-band">
    <div class="quote-next">
      <h2 id="quote-title" class="h2">${accent(o.title ?? "Get your *quote*.")}</h2>
      <p class="lead">${esc(o.intro ?? `Tell us the garment, the quantity, your artwork and your date. We'll confirm the details within ${FACTS.replyWithin}, and you approve a proof before anything prints.`)}</p>
      <ul class="checklist">
        <li>${icon("check")}<span><b>No minimum order</b><small>One shirt or a thousand.</small></span></li>
        <li>${icon("sealCheck")}<span><b>A proof before anything prints</b><small>You approve the mockup and the price first.</small></span></li>
        <li>${icon("printer")}<span><b>Printed in our ${esc(SHOP.city)} shop</b><small>Pick up on ${esc(SHOP.street.replace(/, Suite.*/, ""))} or we ship.</small></span></li>
      </ul>
      <div class="quote-alt"><b>Rather talk it through?</b><a href="${esc(SHOP.phoneHref)}" data-cta="quote_call">Call</a> or <a href="${esc(SHOP.smsHref)}" data-cta="quote_text">text</a> ${esc(SHOP.phoneDisplay)} — ${esc(SHOP.hours)}.</div>
    </div>
    <div class="quote-frame"><iframe src="${esc(SITE.quoteEmbed)}" title="ARK quote form" data-quote-frame ${o.eager ? "" : 'loading="lazy" '}allow="clipboard-write"></iframe></div>
  </div>
</div></section>`;
}

export function finalCta(heading, text, o = {}) {
  return `<section class="section" aria-labelledby="final-cta-title"><div class="container">
  <div class="tile tile--navy on-dark closing" data-appear>
    ${SEAL}
    <div>
      <h2 id="final-cta-title" class="h1">${accent(heading)}</h2>
      <p>${esc(text)}</p>
    </div>
    <div><div class="cta-row">${quoteButton("final", { onDark: true, onPage: o.onPage })}<a class="btn btn--ghost btn--lg" href="${esc(SHOP.phoneHref)}" data-cta="final_call">${icon("phone")}Call ${esc(SHOP.phoneDisplay)}</a></div>${reassure(REASSURANCE)}</div>
  </div>
</div></section>`;
}

export function crumbs(items) {
  return `<nav aria-label="Breadcrumb"><ol class="crumbs">${items.map((c, i) => `<li>${i < items.length - 1 ? `<a href="${esc(c.href)}">${esc(c.name)}</a>` : `<span aria-current="page">${esc(c.name)}</span>`}</li>`).join("")}</ol></nav>`;
}

/** Migrated content: cards grouped into a grid, images into an image grid
 *  (optimised), tables made scrollable on phones, internal links fixed. */
export function prose(html, o = {}) {
  let out = html
    .replace(/(?:<article>[\s\S]*?<\/article>\s*)+/g, (m) => `<div class="card-grid">${m}</div>`)
    .replace(/<img src="([^"]+)" alt="([^"]*)">/g, (_, src, alt) => picture(src, { alt, sizes: "(min-width: 960px) 360px, 90vw" }))
    .replace(/(?:(?:<picture>[\s\S]*?<\/picture>|<img [^>]+>)\s*){2,}/g, (m) => `<div class="img-grid">${m}</div>`)
    .replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, "</table></div>")
    // Pages that never existed on the site: point them at the screen-printing page.
    .replace(/href="\/(water-based-screen-printing|discharge-screen-printing)"/g, 'href="/custom-silk-screen-printing"')
    .replace(/href="\/custom-designer"/g, 'href="/get-a-quote#quote"');
  return `<div class="prose${o.wide ? " prose--wide" : ""}">${out}</div>`;
}

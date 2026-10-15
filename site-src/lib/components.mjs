import fs from "node:fs";
import { FACTS, GOOGLE, SERVICES, SHOP, SITE } from "./facts.mjs";
import { accent, esc, ldScript } from "./html.mjs";
import { icon } from "./icons.mjs";
import { imageInfo, picture } from "./images.mjs";
import { PHOTOS } from "./media.mjs";

// Building blocks, in the Verdara language: Fraunces headlines with one italic
// accent word, pill buttons, 20 px cards and colour-block tiles, the ARK seal
// on big tiles. Pure functions of their inputs; every value is escaped.

// The owner's published picks. Relative dates ("2 days ago") were true when
// pasted and aren't now, so they're dropped (FTC: no misleading recency).
export const REVIEWS = JSON.parse(fs.readFileSync(new URL("../content/reviews.json", import.meta.url), "utf8"))
  .map((r) => ({ ...r, date: r.date && !/ago|google/i.test(r.date) ? r.date : null }));
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
  return `<a class="btn ${o.onDark ? "btn--accent" : "btn--primary"} btn--lg" href="${href}" data-cta="${esc(placement)}">${esc(o.label ?? "See Your Price Instantly")} ${icon("arrowRight")}</a>`;
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
export const REASSURANCE = [`Free mockup in ${FACTS.mockupWithin}`, "Free artwork cleanup", "No obligation · no minimum order"];

/** The lead offer as a colour-block tile: the free mockup first, free
 *  artwork cleanup second, one action. */
export function offerTile(placement, o = {}) {
  return `<section class="section--tight" aria-labelledby="${esc(placement)}-title"><div class="container"><div class="offer" data-appear>
  <div class="offer-main">
    <p class="kicker">Free · no obligation</p>
    <h2 id="${esc(placement)}-title" class="h3">${accent(`See your design on the shirt in *${FACTS.mockupWithin}*.`)}</h2>
    <p>Send your logo or idea and we'll send back a free mockup of it on your garment — usually within ${esc(FACTS.mockupWithin)} (${esc(FACTS.replyHours)}). No obligation to order.</p>
  </div>
  <ul class="offer-list">
    <li>${icon("image")}<span><b>Free mockup</b><small>Your design on the real garment, in ${esc(FACTS.mockupWithin)}.</small></span></li>
    <li>${icon("paintBrush")}<span><b>Free artwork cleanup</b><small>A sketch, a photo, a rough logo — we'll clean it up free.</small></span></li>
  </ul>
  <div class="offer-cta">${quoteButton(placement, { onPage: o.onPage, label: "Get My Free Mockup" })}</div>
</div></div></section>`;
}

/** A compact call to action placed between sections (strategic repeats of the
 *  one action: after proof, after the offer, after the page's own content). */
export function ctaBand(placement, o = {}) {
  return `<section class="section--tight" aria-label="See Your Price Instantly"><div class="container"><div class="cta-band" data-appear>
  <p><b>${esc(o.title ?? "Ready when you are.")}</b> ${esc(o.text ?? `See your price as you go, get a free mockup in ${FACTS.mockupWithin} (${FACTS.replyHours}), and printing can start ${FACTS.printStart}.`)}</p>
  <div class="cta-band-actions">${quoteButton(placement, { onPage: o.onPage })}<a class="text-link" href="${esc(SHOP.phoneHref)}" data-cta="${esc(placement)}_call">${icon("phone")}Call or text ${esc(SHOP.phoneDisplay)}</a></div>
</div></div></section>`;
}

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
    <li>${icon("lightning")}<span><b>Your price</b> — instantly</span></li>
    <li>${icon("image")}<span><b>Free mockup</b> — about 10 min, 7:30am–7pm</span></li>
    <li>${icon("sealCheck")}<span><b>Approve it</b> — no obligation till then</span></li>
    <li>${icon("printer")}<span><b>Printing</b> — can start the same day</span></li>
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
    <span class="chip chip--tan hero-tag">${icon("printer")}On our press</span>
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
    { figure: "1+", label: "shirts: no minimum order (DTF, full colour)" },
    { figure: `${FACTS.screenFrom}+`, label: "shirts: screen printing" },
    { figure: "10 min", label: "a reply, 7:30am–7pm every day" },
    { figure: "Same day", label: "printing can start once you approve the proof" },
  ];
  return `<div class="tile tile--navy on-dark" data-appear>
  ${SEAL}
  <div class="rule">
    <div>
      <h2 id="${esc(id)}" class="h2">${accent(o.title ?? "One shirt or a thousand — *no* minimum.")}</h2>
      <p>Screen printing needs a screen made for each ink colour, so it starts at ${FACTS.screenFrom} shirts — that's where it pays off. Under ${FACTS.screenFrom}, we print with DTF: no screens, no setup, full colour, even for a single shirt. Tell us your quantity and we'll recommend the right method — you don't need to know which one you want.</p>
      <div class="cta-row">${quoteButton("rules_quote", { onDark: true, onPage: o.onPage })}${textLink("/dtf-vs-screen-printing", "DTF vs screen printing", "rules_compare")}</div>
    </div>
    <ul class="stats">${stats.map((s) => `<li><span class="stat-figure">${esc(s.figure)}</span><span class="stat-label">${esc(s.label)}</span></li>`).join("")}</ul>
  </div>
</div>`;
}

/** The named process, as the thank-you page describes it: request → we
 *  confirm (a call, or an email if we miss you) → you approve the proof →
 *  we invoice and print. The proof comes before anything is printed. */
export const PROCESS = [
  { title: "See your price instantly", text: "Pick the garment, the quantity and where it's printed — the form shows your price as you go. About two minutes, or call or text and talk it through." },
  { title: `Your free mockup in ${FACTS.mockupWithin}`, text: `We're in touch within ${FACTS.replyWithin} (${FACTS.replyHours}) with a free mockup of your design on the garment — no obligation. Rough artwork? We'll clean it up free.` },
  { title: "Approve it, then pay", text: "Tweak the mockup until it's right. Nothing is printed until you approve it and pay the invoice." },
  { title: "Printing starts the same day", text: `Approve the proof and pay the invoice, and printing can start the same day — most screen-print orders are done in ${FACTS.turnaround.screen}. ${FACTS.pickup}, or we ship anywhere in the US.` },
];

export function stepsList(steps = PROCESS) {
  return `<ol class="steps">${steps.map((s, i) => `<li class="step" data-appear><span class="step-num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join("")}</ol>`;
}

export function serviceTiles(lines) {
  return `<ul class="service-tiles">${SERVICES.map((s) => `<li><a class="service-tile" href="/${s.slug}" data-cta="service_${esc(s.slug)}" data-appear>${icon(s.icon)}<h3>${esc(s.label)}</h3><p>${esc(lines[s.slug] ?? "")}</p><span class="text-link">See ${esc(s.label.toLowerCase())} ${icon("arrowRight")}</span></a></li>`).join("")}</ul>`;
}

/** Real Google reviews the owner published on the site (source and date shown). */
export function reviewsGrid(limit = REVIEWS.length) {
  return `<ul class="reviews">${REVIEWS.slice(0, limit).map((r) => `<li class="review" data-appear>
  ${stars()}
  <blockquote>“${esc(r.quote)}”</blockquote>
  <footer>${r.photo ? `<img src="${esc(encodeURI(r.photo))}" width="40" height="40" alt="" loading="lazy" decoding="async">` : ""}<span><b>${esc(r.name)}</b>Google review${r.date ? ` · ${esc(r.date)}` : ""}</span></footer>
</li>`).join("")}</ul>`;
}

/** Reviews as a moving ticker: two offset rows drifting in opposite
 *  directions. Each review is read once by screen readers (repeats are
 *  aria-hidden); it moves only once site.js wires the pause button (WCAG
 *  2.2.2), pauses on hover and focus, and without JavaScript or with reduced
 *  motion it's two still rows you can scroll. */
export function reviewsTicker() {
  const avatar = (r) => r.photo
    ? `<img src="${esc(encodeURI(r.photo))}" width="40" height="40" alt="" loading="lazy" decoding="async">`
    : `<span class="avatar" aria-hidden="true">${esc((r.name || "?").trim().charAt(0).toUpperCase())}</span>`;
  const card = (r, hidden) => `<li class="rt-card"${hidden ? ' aria-hidden="true"' : ""}>
    <div class="rt-top">${avatar(r)}<span class="rt-who"><b>${esc(r.name)}</b>${stars("stars", r.rating ?? 5)}<span class="visually-hidden">Rated ${r.rating ?? 5} out of 5, Google review</span></span>${icon("googleLogo", "icon rt-g")}</div>
    <p class="rt-text">${esc(r.quote)}</p>
  </li>`;
  const rows = [[], []];
  REVIEWS.forEach((r, i) => rows[i % 2].push(r));
  if (!rows[1].length) rows.pop();
  const row = (items, k) => {
    // Repeat short rows so the strip is wider than any screen; repeats and the
    // loop's second half are aria-hidden.
    const seq = items.map((r) => ({ r, hidden: false }));
    while (seq.length < 6) seq.push(...items.map((r) => ({ r, hidden: true })));
    const html = seq.map((x) => card(x.r, x.hidden)).join("") + seq.map((x) => card(x.r, true)).join("");
    return `<div class="rt-row rt-row--${k ? "b" : "a"}"><ul class="rt-track" style="--rt-dur:${seq.length * 7}s">${html}</ul></div>`;
  };
  return `<div class="rt" data-ticker role="region" aria-label="Google reviews">
  ${rows.map((items, k) => row(items, k)).join("")}
  <button class="ticker-toggle rt-toggle" type="button" data-ticker-toggle aria-pressed="false" hidden>${icon("pause", "icon i-pause")}${icon("play", "icon i-play")}<span class="visually-hidden">Pause the moving reviews</span></button>
</div>`;
}

export function proofSection(id, title, o = {}) {
  const asOf = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${GOOGLE.checked}T00:00:00Z`));
  return `<div class="reviews-block">
  <div class="reviews-head" data-appear>
    <a class="rating-line" href="${esc(GOOGLE.url)}" target="_blank" rel="noopener" data-cta="reviews_rating">${stars()}<span><b>${GOOGLE.rating.toFixed(1)}/5</b> based on ${GOOGLE.count} Google reviews · as of ${asOf}<span class="visually-hidden"> (opens Google)</span></span></a>
    <h2 id="${esc(id)}" class="h2">${accent(title)}</h2>
    <p class="muted">${esc(o.note ?? `Real Google reviews of our ${SHOP.city} print shop.`)}</p>
  </div>
  ${reviewsTicker()}
  <div class="cta-row reviews-actions">${quoteButton("reviews_quote", { onPage: o.onPage })}<a class="text-link" href="${esc(GOOGLE.url)}" target="_blank" rel="noopener" data-cta="reviews_google">Read all reviews on Google ${icon("arrowUpRight")}<span class="visually-hidden"> (opens Google)</span></a></div>
</div>`;
}

export function ownerSection(id, o = {}) {
  return `<div class="owner">
  <figure class="photo">${picture(PHOTOS.owner.src, { alt: PHOTOS.owner.alt, sizes: "(min-width: 960px) 480px, 90vw" })}</figure>
  <div>
    <p class="kicker">Meet the printer</p>
    <h2 id="${esc(id)}" class="h2">${accent(o.title ?? "You'll talk to the person who *prints* it.")}</h2>
    <p class="lead" style="margin-top:18px">ARK is a small, owner-operated shop in ${esc(SHOP.city)}. ${esc(SHOP.owner)} quotes your job, checks your art, pulls the prints and answers the phone — since ${SHOP.since}.</p>
    <ul class="checklist" style="margin-top:22px">
      <li>${icon("sealCheck")}<span><b>Licensed and insured</b><small>A fully licensed Colorado business with liability insurance.</small></span></li>
      <li>${icon("palette")}<span><b>Premium inks</b><small>${esc(FACTS.inks)}.</small></span></li>
      <li>${icon("shieldCheck")}<span><b>Satisfaction guarantee</b><small>${esc(FACTS.guarantee)}</small></span></li>
    </ul>
    <div class="cta-row">${quoteButton("owner_quote", { onPage: o.onPage })}${o.more === false ? "" : textLink("/about", "The ARK story", "owner_about")}</div>
  </div>
</div>`;
}

export function galleryGrid(items, o = {}) {
  return `<ul class="gallery">${items.map((it) => {
    const src = typeof it === "string" ? it : it.src;
    const alt = typeof it === "string" ? "" : it.alt;
    const pic = picture(src, { alt, sizes: "(min-width: 900px) 400px, 50vw" });
    const full = imageInfo(src)?.variants?.at(-1)?.file ?? src;
    return `<li data-appear>${o.lightbox ? `<a href="${esc(full)}" data-lightbox data-alt="${esc(alt)}">${pic}</a>` : pic}</li>`;
  }).join("")}</ul>${o.lightbox && o.dialog !== false ? `<dialog class="lightbox" data-lightbox-dialog aria-label="Photo"><img src="" alt=""><div class="lightbox-bar"><span data-lightbox-caption></span><button type="button" data-lightbox-close>${icon("x")}<span class="visually-hidden">Close</span></button></div></dialog>` : ""}`;
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
      <p class="lead">${esc(o.intro ?? `Tell us the garment, the quantity, your artwork and your date. Your price shows as you go, a free mockup follows in ${FACTS.mockupWithin} (${FACTS.replyHours}) with no obligation, and printing can start ${FACTS.printStart}.`)}</p>
      <ul class="checklist">
        <li>${icon("image")}<span><b>Free mockup in ${esc(FACTS.mockupWithin)}</b><small>Your design on the garment — no obligation.</small></span></li>
        <li>${icon("paintBrush")}<span><b>Free artwork cleanup</b><small>Send whatever you have — a sketch, a photo, a rough logo.</small></span></li>
        <li>${icon("printer")}<span><b>Printing can start the same day</b><small>In our ${esc(SHOP.city)} shop. ${esc(FACTS.pickup)}, or we ship anywhere in the US.</small></span></li>
      </ul>
      <div class="quote-alt"><b>Rather talk it through?</b><a href="${esc(SHOP.phoneHref)}" data-cta="quote_call">Call</a> or <a href="${esc(SHOP.smsHref)}" data-cta="quote_text">text</a> ${esc(SHOP.phoneDisplay)} — ${esc(SHOP.hours)}. We reply within ${esc(FACTS.replyWithin)}.</div>
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

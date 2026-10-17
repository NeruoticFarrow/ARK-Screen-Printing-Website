import fs from "node:fs";
import { FACTS, GOOGLE, REVIEWS_FEED, SERVICES, SHOP, SITE } from "./facts.mjs";
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
export const SEAL = `<img class="seal" src="/assets/brand/ark-seal.png" width="300" height="304" alt="" loading="lazy" decoding="async">`;

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
  return `<a class="btn btn--ghost btn--lg" href="${esc(SHOP.smsHref)}" data-cta="${esc(placement)}">${icon("chatCircleText")}${esc(o.label ?? `Text ${SHOP.phoneDisplay} (preferred)`)}</a>`;
}

export function ctaRow(placement, o = {}) {
  return `<div class="cta-row">${quoteButton(placement, o)}${o.noCall ? "" : callButton(`${placement}_call`)}</div>${o.note ? `<p class="cta-note">${o.note}</p>` : ""}`;
}

export function reassure(lines) {
  return `<ul class="reassure">${lines.map((l) => `<li>${icon("check")}${esc(l)}</li>`).join("")}</ul>`;
}

/** The risk reducers under every primary CTA — each one true (facts.mjs). */
export const REASSURANCE = [`Free digital mockup within ${FACTS.mockupWithin}`, "Free artwork cleanup", "No commitment required"];

/** The lead offer as a colour-block tile: the free mockup first, free
 *  artwork cleanup second, one action. */
export function offerTile(placement, o = {}) {
  return `<section class="section--tight" aria-labelledby="${esc(placement)}-title"><div class="container"><div class="offer" data-appear>
  <div class="offer-main">
    <p class="kicker">Free · no obligation</p>
    <h2 id="${esc(placement)}-title" class="h3">${accent(`See your design on the shirt in *${FACTS.mockupWithin}*.`)}</h2>
    <p>Send your logo or idea. ${esc(FACTS.mockupPromise)}</p>
  </div>
  <ul class="offer-list">
    <li>${icon("image")}<span><b>Free digital mockup</b><small>Your design on the real garment within ${esc(FACTS.mockupWithin)} — no commitment required.</small></span></li>
    <li>${icon("paintBrush")}<span><b>Free artwork cleanup</b><small>A sketch, a photo, a rough logo — we'll clean it up free.</small></span></li>
  </ul>
  <div class="offer-cta">${quoteButton(placement, { onPage: o.onPage, label: "Get My Free Mockup" })}</div>
</div></div></section>`;
}

/** A compact call to action placed between sections (strategic repeats of the
 *  one action: after proof, after the offer, after the page's own content). */
export function ctaBand(placement, o = {}) {
  return `<section class="section--tight" aria-label="${esc(o.label ?? "See Your Price Instantly")}"><div class="container"><div class="cta-band" data-appear>
  <p><b>${esc(o.title ?? "Ready when you are.")}</b> ${esc(o.text ?? `See your price as you go. ${FACTS.mockupPromise} We start your order ${FACTS.printStart} once you approve the proof and pay the invoice.`)}</p>
  <div class="cta-band-actions">${quoteButton(placement, { onPage: o.onPage, label: o.label })}<a class="text-link" href="${esc(SHOP.smsHref)}" data-cta="${esc(placement)}_text">${icon("chatCircleText")}Text ${esc(SHOP.phoneDisplay)} (preferred)</a></div>
</div></div></section>`;
}

export function stars(className = "stars", value = GOOGLE.rating) {
  return `<span class="${className}" aria-hidden="true">${Array.from({ length: Math.round(value) }, () => icon("starFill")).join("")}</span>`;
}

export function ratingLink(placement) {
  return `<a class="rating" href="${esc(GOOGLE.url)}" target="_blank" rel="noopener" data-cta="${esc(placement)}">${stars()}<span><b><span data-rv-rating>${GOOGLE.rating.toFixed(1)}</span> on Google</b> · <span data-rv-count>${GOOGLE.count}</span> reviews<span class="visually-hidden"> (opens Google)</span></span></a>`;
}

/** Where we are, hours and call/text: local proof in plain sight. The rating
 *  sits in every hero above it, so the strip doesn't repeat it (owner,
 *  2026-10-16); the address shows as the city line. */
export function localStrip(placement = "strip") {
  return `<div class="local-strip">
  <span>${icon("mapPin")}<a href="${esc(SHOP.mapsUrl)}" target="_blank" rel="noopener" data-cta="${esc(placement)}_map">${esc(SHOP.cityLine)}<span class="visually-hidden"> (opens Google Maps)</span></a></span>
  <span>${icon("clock")}${esc(SHOP.hours)}</span>
  <span>${icon("chatCircleText")}<a href="${esc(SHOP.smsHref)}" data-cta="${esc(placement)}_text">Text ${esc(SHOP.phoneDisplay)} (preferred)</a> or <a href="${esc(SHOP.phoneHref)}" data-cta="${esc(placement)}_call">call</a></span>
</div>`;
}

/* ── Doodles: hand-drawn marks in the logo's colours, decoration only. */
const DOODLES = {
  burst: `<svg viewBox="0 0 100 100" focusable="false"><g fill="currentColor">${Array.from({ length: 8 }, (_, k) => `<ellipse cx="50" cy="25" rx="9" ry="23" transform="rotate(${k * 45} 50 50)"/>`).join("")}<circle cx="50" cy="50" r="13"/></g></svg>`,
  loop: `<svg viewBox="0 0 160 90" fill="none" focusable="false"><path pathLength="1" d="M5 72C30 22 64 8 73 34s-31 40-26 14S105 15 155 28" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  strokes: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" focusable="false"><path pathLength="1" d="M16 48 56 14"/><path pathLength="1" d="M22 68 74 26"/><path pathLength="1" d="M36 84 86 44"/></svg>`,
};
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** "We print for": the scrolling audience strip, the same on every page that
 *  shows one (owner, 2026-10-16) — the home page's, with its 25 audiences. */
export function audienceStrip() {
  return `<section class="section--tight"><div class="container">${ticker("We print for", HOME_AUDIENCES)}</div></section>`;
}

export function swash(word) {
  return `<em class="accent swash">${esc(word)}<svg class="swash-line" viewBox="0 0 120 16" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="M4 11C36 4 80 3 116 9"/></svg></em>`;
}

export function doodle(kind, className = "", attrs = "") {
  return `<span class="doodle doodle--${kind}${className ? ` ${className}` : ""}" aria-hidden="true"${attrs}>${DOODLES[kind]}</span>`;
}
export const layer = (depth, order, extra = "") => ` data-depth="${depth}" style="--i:${order}"${extra}`;

export function sticker(attrs) {
  return `<span class="sticker" aria-hidden="true"${attrs}><svg viewBox="0 0 120 120" focusable="false"><defs><path id="sticker-ring" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0"/></defs><circle cx="60" cy="60" r="59" class="sticker-disc"/><circle cx="60" cy="60" r="31" class="sticker-core"/><text class="sticker-text"><textPath href="#sticker-ring" textLength="278" lengthAdjust="spacingAndGlyphs">ARK SCREEN PRINTING · COLORADO SPRINGS ·</textPath></text><image href="/assets/brand/ark-logo-120.png" x="38" y="38" width="44" height="44"/></svg></span>`;
}

export function floatChip(name, text, className, attrs) {
  return `<span class="float-chip ${className}"${attrs}>${icon(name)}<span>${esc(text)}</span></span>`;
}

/** How an order goes, on a card in front of the hero photo. Every line is
 *  also said in the page's copy, so the card can stay presentational. */
function orderCard() {
  return `<div class="order-card"${layer(-0.04, 11)}>
  <span class="oc-title">How your order goes <span class="badge badge--sky">4 steps</span></span>
  <ol>
    <li>${icon("lightning")}<span><b>Your price</b> — instantly</span></li>
    <li>${icon("image")}<span><b>Free digital mockup</b> — within 10 min</span></li>
    <li>${icon("sealCheck")}<span><b>Approve it</b> — no obligation till then</span></li>
    <li>${icon("printer")}<span><b>We start</b> — the same day</span></li>
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
    { figure: "10 min", label: "free digital mockup" },
    { figure: "Same day", label: "we start your order once you approve the proof" },
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
  { title: "See your price instantly", text: "Pick the garment, the quantity and where it's printed — the form shows your price as you go. About two minutes. Prefer to talk it through? Text us." },
  { title: `Your free digital mockup in ${FACTS.mockupWithin}`, text: `${FACTS.mockupPromise} Rough artwork? We'll clean it up free.` },
  { title: "Approve it, then pay", text: "Tweak the mockup until it's right. Nothing is printed until you approve it and pay the invoice." },
  { title: "We start the same day", text: `Approve the proof and pay the invoice, and we start your order the same day — ${FACTS.sameDayWork}. Most screen-print orders are ready in ${FACTS.turnaround.screen}. ${FACTS.pickup}, or we ship anywhere in the US.` },
];

export function stepsList(steps = PROCESS) {
  return `<ol class="steps">${steps.map((s, i) => `<li class="step" data-appear><span class="step-num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join("")}</ol>`;
}

export function serviceTiles(lines) {
  return `<ul class="service-tiles">${SERVICES.map((s) => `<li><a class="service-tile" href="/${s.slug}" data-cta="service_${esc(s.slug)}" data-appear>${icon(s.icon)}<h3>${esc(s.label)}</h3><p>${esc(lines[s.slug] ?? "")}</p><span class="text-link">See ${esc(s.label.toLowerCase())} ${icon("arrowRight")}</span></a></li>`).join("")}</ul>`;
}

/** Google's multicolour "G", marking each card as a Google review the way
 *  Google's own review widgets do. site.js clones it for live cards. */
const GOOGLE_G = `<svg class="rt-g" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.56 10.56 0 0 0 12 1 11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>`;

/** Initials get one of three logo colours, picked from the name so a
 *  reviewer keeps theirs. site.js uses the same sum for live cards. */
export const avatarTone = (name) => {
  let n = 0;
  for (let i = 0; i < name.length; i += 1) n += name.charCodeAt(i);
  return n % 3;
};

/** One ticker card, laid out like the owner's reference ("Google Reviews
 *  Ticker"): photo or initial, three lines of the review, "@Name" and the
 *  Google G, which links to the review on Google when there's a link. Its
 *  stars show only when the ticker's ratings differ (.rt--rated): the
 *  reference has none, and an all-5★ strip says so in its header.
 *  site.js builds live cards to the same markup — change both together. */
function tickerCard(r, hidden) {
  const name = (r.name || "Google reviewer").trim();
  const rating = r.rating ?? 5;
  const avatar = r.photo
    ? `<img class="rt-av" src="${esc(/^https:/.test(r.photo) ? r.photo : encodeURI(r.photo))}" width="44" height="44" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
    : `<span class="rt-av rt-av--t${avatarTone(name)}" aria-hidden="true">${esc(name.charAt(0).toUpperCase())}</span>`;
  const mark = /^https:\/\/www\.google\.com\/maps\//.test(r.url ?? "")
    ? `<a class="rt-src" href="${esc(r.url)}" target="_blank" rel="noopener"${hidden ? ' tabindex="-1"' : ""} aria-label="Read ${esc(name)}’s review on Google (opens Google)">${GOOGLE_G}</a>`
    : GOOGLE_G;
  return `<li class="rt-card"${hidden ? ' aria-hidden="true"' : ""}>${avatar}<div class="rt-body"><p class="rt-text">${esc(r.quote)}</p><p class="rt-foot"><b class="rt-name"><span aria-hidden="true">@</span>${esc(name)}</b>${stars("rt-stars", rating)}<span class="visually-hidden">, rated ${rating} out of 5 on Google</span>${mark}</p></div></li>`;
}

/** Reviews as a moving ticker: two offset rows drifting in opposite
 *  directions (the owner's reference has three; they asked for two). Each
 *  review is read once by screen readers (repeats are aria-hidden); it moves
 *  only once site.js wires the pause button (WCAG 2.2.2), pauses on hover and
 *  focus, and without JavaScript or with reduced motion it's two still rows
 *  you can scroll. With o.live (the Reviews page only, where Starwall's own
 *  widget used to sit) site.js swaps in the newest reviews from the Starwall
 *  feed, fresh on every view — Google's terms allow no caching — and these
 *  built-in ones stay if the feed fails. */
export function reviewsTicker(o = {}) {
  const feed = o.live && !GOOGLE.live ? REVIEWS_FEED : "";
  const rated = REVIEWS.some((r) => (r.rating ?? 5) < 5);
  const rows = [[], []];
  REVIEWS.forEach((r, i) => rows[i % 2].push(r));
  if (!rows[1].length) rows.pop();
  const row = (items, k) => {
    // Repeat short rows so the strip is wider than any screen; repeats and the
    // loop's second half are aria-hidden.
    const seq = items.map((r) => ({ r, hidden: false }));
    while (seq.length < 6) seq.push(...items.map((r) => ({ r, hidden: true })));
    const html = seq.map((x) => tickerCard(x.r, x.hidden)).join("") + seq.map((x) => tickerCard(x.r, true)).join("");
    return `<div class="rt-row rt-row--${k ? "b" : "a"}"><ul class="rt-track" style="--rt-dur:${seq.length * 7}s">${html}</ul></div>`;
  };
  // A live strip says where its reviews come from and in what order (Google's
  // Places policies: the "Google Maps" credit and an ordering notice). Both
  // lines are rendered so the swap never reflows the page.
  // With the Business Profile sync on, the strip is every review, newest first.
  const synced = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${GOOGLE.checked}T00:00:00Z`));
  const note = feed
    ? `<p class="rt-note"><span data-rv-note="built">A selection of our reviews on Google.</span><span data-rv-note="live" hidden>Our newest reviews on <span class="rt-maps" translate="no">Google Maps</span>, newest first.</span></p>`
    : GOOGLE.live ? `<p class="rt-note">Our newest Google reviews, newest first and every rating, as of ${esc(synced)}.</p>` : "";
  return `<div class="rt${rated ? " rt--rated" : ""}" data-ticker${feed ? ` data-reviews-feed="${esc(feed)}"` : ""} role="region" aria-label="Google reviews">
  ${rows.map((items, k) => row(items, k)).join("")}
  <button class="ticker-toggle rt-toggle" type="button" data-ticker-toggle aria-pressed="false" hidden>${icon("pause", "icon i-pause")}${icon("play", "icon i-play")}<span class="visually-hidden">Pause the moving reviews</span></button>
  ${note}
</div>`;
}

/** The reviews block: the rating, a heading and the ticker, as in the
 *  owner's reference. o.live turns on the live Google feed (the Reviews page
 *  only); o.leaveReview adds the "leave us a review" link there. */
export function proofSection(id, title, o = {}) {
  const asOf = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${GOOGLE.checked}T00:00:00Z`));
  const leave = o.leaveReview
    ? `<a class="text-link" href="${esc(GOOGLE.writeReviewUrl)}" target="_blank" rel="noopener" data-cta="reviews_leave">Leave us a review ${icon("arrowUpRight")}<span class="visually-hidden"> (opens Google)</span></a>`
    : "";
  return `<div class="reviews-block">
  <div class="reviews-head" data-appear>
    <a class="rating-line" href="${esc(GOOGLE.url)}" target="_blank" rel="noopener" data-cta="reviews_rating">${stars()}<span><b><span data-rv-rating>${GOOGLE.rating.toFixed(1)}</span>/5</b> based on <b data-rv-count>${GOOGLE.count}</b> Google reviews · as of <span data-rv-asof>${asOf}</span><span class="visually-hidden"> (opens Google)</span></span></a>
    <h2 id="${esc(id)}" class="h2">${accent(title)}</h2>
    <p class="muted">${esc(o.note ?? `Real Google reviews of our ${SHOP.city} print shop.`)}${GOOGLE.live ? " Synced from Google each week." : ""}</p>
  </div>
  ${reviewsTicker({ live: o.live })}
  <div class="cta-row reviews-actions">${o.button ?? quoteButton("reviews_quote", { onPage: o.onPage })}<a class="text-link" href="${esc(GOOGLE.url)}" target="_blank" rel="noopener" data-cta="reviews_google">Read all reviews on Google ${icon("arrowUpRight")}<span class="visually-hidden"> (opens Google)</span></a>${leave}</div>
</div>`;
}

export function ownerSection(id, o = {}) {
  return `<div class="owner">
  <figure class="photo">${picture(PHOTOS.owner.src, { alt: PHOTOS.owner.alt, sizes: "(min-width: 960px) 480px, 90vw" })}</figure>
  <div>
    <p class="kicker">Meet the printer</p>
    <h2 id="${esc(id)}" class="h2">${accent(o.title ?? "Real people, *real* presses.")}</h2>
    <p class="lead" style="margin-top:18px">ARK is a small, owner-run print shop in ${esc(SHOP.city)}. Text, call or share your project details and a real person at ARK answers — not a call centre — and keeps your order on track from mockup to pickup. ${esc(SHOP.owner)}, the owner, has pulled the prints since ${SHOP.since}.</p>
    <ul class="checklist" style="margin-top:22px">
      <li>${icon("sealCheck")}<span><b>Licensed and insured</b><small>A fully licensed Colorado business with liability insurance.</small></span></li>
      <li>${icon("palette")}<span><b>Premium inks</b><small>${esc(FACTS.inks)}.</small></span></li>
      <li>${icon("shieldCheck")}<span><b>Satisfaction guarantee</b><small>${esc(FACTS.guarantee)}</small></span></li>
    </ul>
    <div class="cta-row">${quoteButton("owner_quote", { onPage: o.onPage })}${o.more === false ? "" : textLink("/about", "The ARK story", "owner_about")}</div>
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

/** The gallery's descriptions, for curated photos given by path alone. */
const GALLERY_ALT = new Map(JSON.parse(fs.readFileSync(new URL("../content/gallery.json", import.meta.url), "utf8")).map((g) => [g.src, g.alt]));

/** Real work: the newest Business Profile photos first (when synced), then
 *  the curated photos, without repeats. */
export function recentWork(curated, n = Infinity) {
  const seen = new Set();
  return [...GBP_PHOTOS.map(gbpItem), ...curated.map((c) => (typeof c === "string" ? { src: c, alt: GALLERY_ALT.get(c) ?? "" } : c))]
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
  }).join("")}</ul>${o.lightbox && o.dialog !== false ? `<dialog class="lightbox" data-lightbox-dialog aria-label="Photo"><img src="" alt=""><div class="lightbox-bar"><span data-lightbox-caption></span><button type="button" data-lightbox-close>${icon("x")}<span class="visually-hidden">Close</span></button></div></dialog>` : ""}`;
}

/** Who each strip names (owner, 2026-10-16: "like 25 categories"). */
export const HOME_AUDIENCES = [
  "Teams & boosters", "Schools & PTOs", "Churches & mission trips", "Businesses & uniforms", "Events & races",
  "Bands & brands", "Nonprofits", "Reunions & gifts", "Military units & squadrons", "First responders",
  "Restaurants & cafés", "Breweries & bars", "Gyms & studios", "Contractors & trades", "Real estate teams",
  "Startups", "Clubs & leagues", "Youth camps", "Homeschool groups", "Dance & theater",
  "Car & motorcycle clubs", "Fundraisers", "Weddings & parties", "Conferences & retreats", "Coaches & trainers",
];
export const POD_AUDIENCES = [
  "Bands & artists", "Clothing brands", "Creators & influencers", "Podcasts & streamers", "Artists & illustrators",
  "Schools & PTOs", "Sports teams", "Booster clubs", "Churches & ministries", "Youth groups & camps",
  "Clubs & communities", "Fundraisers & causes", "Nonprofits", "Small businesses", "Coffee shops & breweries",
  "Gyms & studios", "Events & festivals", "Races & tournaments", "Family reunions", "Weddings & parties",
  "Gamers & esports teams", "Dance & theater", "Car & motorcycle clubs", "Homeschool groups", "Coaches & trainers",
];
export const FUNDRAISING_AUDIENCES = [
  "Schools & PTOs", "Booster clubs", "Sports teams", "Nonprofits", "Churches & youth groups",
  "Mission trips", "Bands & clubs", "Memorials & causes", "Scout troops", "Theater & choir",
  "Robotics & STEM teams", "Dance teams", "Cheer squads", "Class trips", "Graduating classes",
  "Animal rescues", "Medical causes", "Community gardens", "Food pantries", "Veterans groups",
  "Fun runs & 5Ks", "Shelters & outreach", "Libraries & museums", "Rec leagues", "Alumni groups",
];

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
      <h2 id="quote-title" class="h2">${accent(o.title ?? "See your live *price*.")}</h2>
      <p class="lead">${esc(o.intro ?? `Tell us the garment, the quantity, your artwork and your date. Your price shows as you go. ${FACTS.mockupPromise}`)}</p>
      <ul class="checklist">
        <li>${icon("lightning")}<span><b>Your price, live</b><small>Pick the garment, quantity and print details to see the price as you go.</small></span></li>
        <li>${icon("image")}<span><b>Free digital mockup within ${esc(FACTS.mockupWithin)}</b><small>Your design on the garment — no commitment required.</small></span></li>
        <li>${icon("paintBrush")}<span><b>Free artwork cleanup</b><small>Send whatever you have — a sketch, a photo, a rough logo.</small></span></li>
        <li>${icon("printer")}<span><b>We start the same day</b><small>${esc(capitalise(FACTS.sameDayWork))} — most orders are ready in ${esc(FACTS.turnaround.screen)}. ${esc(FACTS.pickup)}, or we ship anywhere in the US.</small></span></li>
      </ul>
      <div class="quote-alt"><b>Rather talk it through?</b><a href="${esc(SHOP.smsHref)}" data-cta="quote_text">Text ${esc(SHOP.phoneDisplay)} (preferred)</a> or <a href="${esc(SHOP.phoneHref)}" data-cta="quote_call">call</a> — ${esc(SHOP.hours)}.</div>
    </div>
    <div class="quote-frame"><iframe src="${esc(SITE.quoteEmbed)}" title="ARK instant price form" data-quote-frame ${o.eager ? "" : 'loading="lazy" '}allow="clipboard-write"></iframe></div>
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

/** A run of photos as one row (img-grid--row): each keeps its own
 *  proportions and all stand the same height — each column's share is its
 *  photo's width/height — like the old embroidery page's three-up row
 *  (owner, 2026-10-16). Phones stack them. */
function photoRow(run) {
  const photos = [...run.matchAll(/<img src="([^"]+)" alt="([^"]*)">/g)].map(([, src, alt]) => {
    const info = imageInfo(src);
    return { src, alt, ratio: info ? info.width / info.height : 1.5 };
  });
  const total = photos.reduce((sum, p) => sum + p.ratio, 0);
  const cols = photos.map((p) => `${+p.ratio.toFixed(3)}fr`).join(" ");
  const cells = photos.map((p) => {
    const share = p.ratio / total;
    return picture(p.src, { alt: p.alt, sizes: `(min-width: 1300px) ${Math.round(1240 * share)}px, (min-width: 700px) ${Math.round(92 * share)}vw, 92vw` });
  });
  return `<div class="img-grid img-grid--row" style="--cols:${cols}">${cells.join("")}</div>`;
}

/** Migrated content: cards grouped into a grid, images into a photo row
 *  (optimised), tables made scrollable on phones, internal links fixed. */
export function prose(html, o = {}) {
  let out = html
    .replace(/(?:<article>[\s\S]*?<\/article>\s*)+/g, (m) => `<div class="card-grid">${m}</div>`)
    .replace(/(?:<img src="[^"]+" alt="[^"]*">\s*){2,}/g, photoRow)
    // A lone image runs the full width of the text.
    .replace(/<img src="([^"]+)" alt="([^"]*)">/g, (_, src, alt) => picture(src, { alt, sizes: "(min-width: 1300px) 1240px, 92vw" }))
    .replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, "</table></div>")
    // Pages that never existed on the site: point them at the screen-printing page.
    .replace(/href="\/(water-based-screen-printing|discharge-screen-printing)"/g, 'href="/custom-silk-screen-printing"')
    .replace(/href="\/custom-designer"/g, 'href="/get-a-quote#quote"');
  return `<div class="prose${o.wide ? " prose--wide" : ""}">${out}</div>`;
}

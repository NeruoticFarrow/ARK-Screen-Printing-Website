import fs from "node:fs";
import { APP, SHOP, STORES } from "./facts.mjs";
import { accent, esc } from "./html.mjs";
import { icon } from "./icons.mjs";
import { picture } from "./images.mjs";
import { doodle, floatChip, layer, SEAL, sticker } from "./components.mjs";

// The creator platform's landing page lives on this site since 2026-10-16
// (owner request): /print-on-demand replaces design.arkscreenprinting.com/
// studio, which now redirects here. This module holds what that page needs
// from the platform, ported from ark-designer server/studioSite: the store
// button (invite-only for now), the profit calculator and its numbers
// (content/studio-pricing.json, refreshed at each Netlify build by
// sync/studio-pricing.mjs), the run rule, the product categories and the
// hero's deck of real prints.

/** The store button follows sign-up: an invite request by email while the
 *  platform is invite-only (as the Studio's own pages did), the sign-up once
 *  it opens (STORES.signupOpen). */
export const STORE_CTA = STORES.signupOpen
  ? {
      label: "Start your store — free",
      href: APP.studioStart,
      note: "",
      reassurance: ["Free to start", "No credit card", "No inventory to buy"],
    }
  : {
      label: "Request an invite",
      href: `mailto:${SHOP.email}?subject=${encodeURIComponent("Creator Platform invite")}&body=${encodeURIComponent("Hi Alex — I'd like an invite to the ARK Creator Platform.\n\nWhat I'd sell (band, brand, club…):\nA link to my work or socials:\n")}`,
      note: "The store platform is invite-only while we finish testing — the button opens an email to ask for yours.",
      reassurance: ["Invite-only while we finish testing", "Free to start when you're in", "You set the price"],
    };

export function storeButton(placement, o = {}) {
  const kind = o.onDark ? "btn--accent" : o.ghost ? "btn--ghost" : "btn--primary";
  return `<a class="btn ${kind} btn--lg" href="${esc(STORE_CTA.href)}" data-cta="${esc(placement)}">${esc(o.label ?? STORE_CTA.label)} ${icon("arrowRight")}</a>`;
}

/** On this page "See Your Price Instantly" opens the profit calculator, not
 *  the bulk-order quote form (owner, 2026-10-16). */
export function priceButton(placement, o = {}) {
  const kind = o.onDark ? "btn--accent" : o.ghost ? "btn--ghost" : "btn--primary";
  return `<a class="btn ${kind} btn--lg" href="#pricing" data-cta="${esc(placement)}">See Your Price Instantly</a>`;
}

export const STUDIO_PRICING = JSON.parse(fs.readFileSync(new URL("../content/studio-pricing.json", import.meta.url), "utf8"));

const money = (n) => `$${n.toFixed(2)}`;
const usd = (n) => (Number.isInteger(n) ? `$${n}` : money(n));

/** "$8 for the first item and $3 for each additional item, up to $35 an
 *  order" (owner, 2026-10-16: the $3 counts at most 9 more items). */
export const shippingText = () => {
  const cap = STORES.shippingFirstUsd + STORES.shippingEachMoreUsd * STORES.shippingMaxMoreItems;
  return `${usd(STORES.shippingFirstUsd)} for the first item and ${usd(STORES.shippingEachMoreUsd)} for each additional item, up to ${usd(cap)} an order`;
};

/** The example price for a tee: the typical price, unless that would sit
 *  below the tee's base — then ARK's suggested price for it. */
const examplePrice = (g) => (STORES.examplePriceUsd > g.dtfBase ? STORES.examplePriceUsd : g.suggestedRetail);

/** Each reference tee's photo, shown beside its name in the calculator
 *  (owner, 2026-10-17): the Studio catalogue's front images (ark-designer
 *  client/public/images/creator-catalog), trimmed onto a white square like
 *  the category photos. A tee the price feed adds later shows without one. */
export const TEE_PHOTOS = {
  "ss_activewear/5000": "/images/catalog/tee-gildan-5000.webp",
  "ss_activewear/3600": "/images/catalog/tee-next-level-3600.webp",
  "as_colour/5001": "/images/catalog/tee-as-colour-5001.webp",
};
const teePhoto = (g) => (TEE_PHOTOS[g.key] ? `<span class="opt-photo">${picture(TEE_PHOTOS[g.key], { alt: "", sizes: "64px" })}</span>` : "");

/** The profit calculator: a complete worked example in the HTML (it reads
 *  without script); site.js makes it live. What you keep = your price − the
 *  tee's base, never below zero — the Studio's own arithmetic. */
export function calculator(o = {}) {
  const { garments, screenMinimum } = STUDIO_PRICING;
  const p = o.idPrefix ?? "calc";
  // A modest run by default — an example, not a projection.
  const units = o.units ?? 30;
  const first = garments[0];
  const price = examplePrice(first);
  const keep = Math.max(0, price - first.dtfBase);
  const method = units >= screenMinimum ? "Screen printed by hand" : "DTF printed";
  const options = garments
    .map((g, i) => `<div class="option"><input type="radio" name="calc-garment" id="${p}-g${i}" value="${esc(g.key)}"${i === 0 ? " checked" : ""}><label for="${p}-g${i}"><span class="dot" aria-hidden="true"></span>${teePhoto(g)}<span class="name">${esc(g.label)}<small>Base ${money(g.dtfBase)} · suggested ${money(g.suggestedRetail)}</small></span><b>${money(g.dtfBase)}</b></label></div>`)
    .join("");
  const data = { screenMinimum, garments: garments.map((g) => ({ key: g.key, dtfBase: g.dtfBase, suggestedRetail: g.suggestedRetail })) };
  return `<div class="calc" data-calculator>
  <div class="calc-form">
    <fieldset>
      <legend class="field-label">Pick a tee</legend>
      <div class="options">${options}</div>
    </fieldset>
    <div class="field">
      <label class="field-label" for="${p}-price">Your price per tee</label>
      <div class="price-field"><span aria-hidden="true">$</span><input id="${p}-price" type="number" inputmode="decimal" min="1" max="500" step="0.01" value="${price.toFixed(2)}" data-calc-price aria-describedby="${p}-price-hint"></div>
      <p class="field-hint" id="${p}-price-hint">Try your own price. Each tee lists our suggested price; the lowest you can set is its base.</p>
    </div>
    <div class="field">
      <label class="field-label" for="${p}-units">Garments sold: <output data-calc-units-out for="${p}-units">${units}</output></label>
      <input class="range" id="${p}-units" type="range" min="1" max="250" step="1" value="${units}" data-calc-units>
      <div class="range-scale" aria-hidden="true"><span>1</span><span>250</span></div>
    </div>
  </div>
  <div class="tile tile--navy on-dark result">
    ${SEAL}
    <div aria-live="polite" aria-atomic="true">
      <span class="label">You'd keep</span>
      <div class="result-total" data-out="total">${money(keep * units)}</div>
      <p class="result-sub">for <span data-out="units">${units}</span> sold</p>
    </div>
    <ul class="result-rows">
      <li><span>Base per tee</span><b data-out="base">${money(first.dtfBase)}</b></li>
      <li><span>You keep per tee</span><b data-out="keep">${money(keep)}</b></li>
      <li><span>A run this size is</span><b data-out="method">${method}</b></li>
    </ul>
    <p class="calc-warning" data-out="warning" hidden></p>
    <p class="calc-note">Buyers pay your price plus shipping: ${esc(shippingText())}. An example of the arithmetic, not a sales forecast.</p>
  </div>
</div>
<script type="application/json" id="calculator-data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

export function calculatorFootnote() {
  return `<p class="calc-foot">Bases are for ${esc(STORES.planningPrint)} on sizes up to XL, under the price rules in force (version ${STUDIO_PRICING.version}): the blank, the print, packing and our margin. 2XL and up cost the buyer more and you keep the same. Your release's base depends on its artwork's size and placements — the Studio shows it before you set a price. What you keep is the same whether a run is screen printed or DTF printed.</p>`;
}

/** Product categories, as the designer groups them (ark-designer client/src/
 *  lib/products.ts CATEGORIES), each shown by a real garment from that
 *  catalogue (its front image, trimmed onto a white square — images/catalog/,
 *  owner 2026-10-16). Each links into the designer on that category until the
 *  catalogue moves to this site; crewneck sweatshirts sit in the designer's
 *  Hoodies category. */
export const CATEGORIES = [
  { name: "Short sleeves", designer: "T-Shirts", photo: "/images/catalog/short-sleeves.webp", alt: "AS Colour Staple Tee in navy" },
  { name: "Long sleeves", designer: "Longsleeves", photo: "/images/catalog/long-sleeves.webp", alt: "AS Colour Staple long-sleeve tee in bone" },
  { name: "Hoodies", designer: "Hoodies", photo: "/images/catalog/hoodies.webp", alt: "AS Colour Stencil Hood in camel" },
  { name: "Sweatshirts", designer: "Hoodies", photo: "/images/catalog/sweatshirts.webp", alt: "AS Colour Heavy Crew sweatshirt in pine green" },
  { name: "Tote bags", designer: "Bags", photo: "/images/catalog/tote-bags.webp", alt: "AS Colour Carrie Tote in cream" },
  { name: "Polos", designer: "Polos", photo: "/images/catalog/polos.webp", alt: "AS Colour Chad Polo in black" },
  { name: "Youth", designer: "Kids", photo: "/images/catalog/youth.webp", alt: "AS Colour Youth Staple Tee in bright royal" },
  { name: "Overalls", designer: "Overalls", photo: "/images/catalog/overalls.webp", alt: "AS Colour Canvas Overalls in walnut" },
  { name: "Tanks", designer: "Singlets", photo: "/images/catalog/tanks.webp", alt: "AS Colour Classic Tank in cypress" },
  { name: "Button-ups", designer: "Shirts", photo: "/images/catalog/button-ups.webp", alt: "AS Colour Work Shirt in navy" },
  { name: "Jackets", designer: "Jackets", photo: "/images/catalog/jackets.webp", alt: "AS Colour Chore Jacket in army" },
  { name: "Aprons", designer: "Aprons", photo: "/images/catalog/aprons.webp", alt: "AS Colour Canvas Apron in black" },
];
const TONES = ["sand", "sky", "surface", "tan"];

export function categoryShowcase() {
  return `<ul class="cats">${CATEGORIES.map((c, i) => {
    const slug = c.name.toLowerCase().replace(/[^a-z]+/g, "_");
    return `<li data-appear style="--i:${i % 4}"><a class="cat cat--${TONES[i % TONES.length]}" href="${esc(`${APP.designer}?category=${encodeURIComponent(c.designer)}`)}" data-cta="pod_category_${slug}">
    <span class="cat-photo">${picture(c.photo, { alt: c.alt, sizes: "(min-width: 900px) 260px, 45vw" })}</span>
    <span class="cat-name">${esc(c.name)}</span>
    <span class="cat-go">Design yours ${icon("arrowUpRight")}<span class="visually-hidden"> (opens the designer)</span></span>
  </a></li>`;
  }).join("")}</ul>`;
}

/** Every order prints; from 24 it's screen printed by hand — exact about
 *  colours (shared/creatorPricing.ts screen.colourLimits). */
export function runRuleTile(id, text, after = "") {
  const [a, b] = STORES.screenColours;
  const stats = [
    { figure: "$0", label: "to open a store" },
    { figure: `${a.from}+`, label: `garments, up to ${a.colours} ink colors: screen printed by hand` },
    { figure: STORES.onDemandShipDays, label: "business days to ship a print-on-demand order" },
    { figure: `${b.from}+`, label: `garments for up to ${b.colours} ink colors on screen` },
  ];
  return `<div class="tile tile--navy on-dark" data-appear>
  ${SEAL}
  <div class="rule">
    <div>
      <h2 id="${esc(id)}" class="h2">${accent(`Every order prints. From ${a.from}, it's *screen printed* by hand.`)}</h2>
      <p>${esc(text)}</p>
      ${after}
    </div>
    <ul class="stats">${stats.map((s) => `<li><span class="stat-figure">${esc(s.figure)}</span><span class="stat-label">${esc(s.label)}</span></li>`).join("")}</ul>
  </div>
</div>`;
}

/** The hero's deck: real prints from the shop, dealt into a fan as the page
 *  loads (each card turns about a pivot below the deck), with the doodles,
 *  the shop's sticker and floating facts around it (Bonfire's layered hero).
 *  The deck and its trimmings drift with the scroll on desktop (site.js);
 *  all of it is still, and fanned, for prefers-reduced-motion. Decorative:
 *  the same work is in the page's gallery with descriptions. */
export const DECK = [
  "/images/gallery/giro-di-california-badge.webp",
  "/images/gallery/hsso-soccer-crest-print.webp",
  "/images/gallery/loac-tee-back.webp",
  "/images/gallery/awaken-camp-tee-on-press.webp",
  "/images/gallery/starmaker-tee-print.webp",
  "/images/gallery/team-powers-quarter-zip-print.webp",
  "/images/gallery/awaken-camp-tee-white.webp",
];

export function deckArt() {
  const mid = (DECK.length - 1) / 2;
  const cards = DECK.map((src, i) => {
    const k = i - mid;
    // The middle card sits on top; the deal runs outwards from it.
    return `<span class="deck-card" style="--k:${k};--d:${Math.abs(k)};z-index:${10 - Math.abs(k)}">${picture(src, { alt: "", sizes: "(min-width: 960px) 240px, 44vw", ...(k === 0 ? { priority: true } : { eager: true }) })}</span>`;
  }).join("");
  return `<div class="deck-stage" data-parallax aria-hidden="true">
  <div class="deck"${layer(0.05, 0)}>${cards}</div>
  ${doodle("burst", "dk-burst", layer(0.24, 1))}
  ${doodle("loop", "dk-loop", layer(0.1, 2))}
  ${doodle("strokes", "dk-strokes", layer(0.18, 3))}
  ${floatChip("storefront", "$0 to open a store", "dk-chip dk-chip--a", layer(0.08, 4))}
  ${floatChip("currencyDollar", "You set the price", "dk-chip dk-chip--b", layer(0.14, 5))}
  ${floatChip("printer", `Printed in ${SHOP.city}`, "dk-chip dk-chip--c", layer(0.06, 6))}
  ${sticker(layer(0.12, 7, ' data-spin="0.12"'))}
</div>`;
}

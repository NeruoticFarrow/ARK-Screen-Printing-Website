import fs from "node:fs";
import { APP, FACTS, SHOP, SITE } from "../lib/facts.mjs";
import { esc, ldScript } from "../lib/html.mjs";
import { icon } from "../lib/icons.mjs";
import { WORK, PHOTOS } from "../lib/media.mjs";
import {
  areasList, ctaRow, doodle, HOME_AUDIENCES, offerTile, recentWork, faqJsonLd, faqList, galleryGrid, heroArt, localStrip, ownerSection, proofSection,
  quoteBand, ratingLink, REASSURANCE, reassure, rulesTile, sectionHead, serviceTiles, stepsList, swash, textLink, ticker,
} from "../lib/components.mjs";
import { SERVICE_PAGES } from "../content/services.mjs";

// The home page, local-first (knowledge base chapter 25 §11.2): what, where
// and how to start on the first screen; local proof in plain sight; who we
// print for; services; the rules stated plainly with the reason; a named
// process with the proof before anything prints; reviews; the printer; real work;
// a bridge for groups; areas; answers; the quote form.

export const HOME_FAQ = [
  { q: "Is there a minimum order?", a: [`No. Screen printing starts at ${FACTS.screenFrom} shirts; under ${FACTS.screenFrom} we print with DTF, which needs no screens — even a single shirt. Tell us your quantity and we'll recommend the right method.`] },
  { q: "How long does an order take?", a: [`Most screen-print orders are done in ${FACTS.turnaround.screen}, DTF in ${FACTS.turnaround.dtf} from artwork approval and embroidery in ${FACTS.turnaround.embroidery}. Need it for a date? Put the date in your quote request or call — rush is often possible.`] },
  { q: "Will I see my design before you print it?", a: [`Yes — and it's free. We send a mockup of your design on the garment, usually within ${FACTS.mockupWithin} (${FACTS.replyHours}). There's no obligation, and nothing is printed until you approve it.`] },
  { q: "Can you help with my artwork?", a: [`Yes — free. Send a logo file, a sketch, a photo or just an idea and we'll clean it up for print at no charge. Our <a href="${APP.artwork}">artwork guidelines</a> explain which files work best.`] },
  { q: "Do you do embroidery?", a: ["Yes — polos, hats, jackets and bags, with free digitizing on every order and no minimum order. See <a href=\"/custom-embroidery\">custom embroidery</a>."] },
  { q: "Is local pickup available?", a: [`Yes — ${FACTS.pickup.toLowerCase()} in ${SHOP.city}, or we'll ship your order anywhere in the US.`] },
  { q: "How fast is it?", a: [`Your price shows as you fill in the form, your free mockup follows in ${FACTS.mockupWithin} (${FACTS.replyHours}), and once you approve it and pay, we start your order ${FACTS.printStart} — ${FACTS.sameDayWork}. Most screen-print orders are ready in ${FACTS.turnaround.screen}.`] },
];

const GALLERY = JSON.parse(fs.readFileSync(new URL("../content/gallery.json", import.meta.url), "utf8"));
/** The home gallery's work: the curated list, with the recent USAF Academy
 *  Prep School order in place of the "Stronger Together" and "100%
 *  Homeschooled" shirts (owner, 2026-10-16). */
const HOME_SWAPS = {
  "/images/gallery/img_0113.jpg": "/images/gallery/usafa-prep-left-chest.webp",
  "/images/gallery/img_0783.jpg": "/images/gallery/usafa-prep-order-boxed.webp",
};
const HOME_WORK = WORK.map((src) => (HOME_SWAPS[src] ? GALLERY.find((g) => g.src === HOME_SWAPS[src]) ?? { src: HOME_SWAPS[src], alt: "" } : src));

export function renderHome(ctx) {
  const hero = `<section class="hero" aria-labelledby="hero-title"><div class="container hero-grid">
  <div>
    <p class="offer-flag">${icon("image")}Free mockup in ${FACTS.mockupWithin} · no obligation</p>
    <h1 id="hero-title" class="display">Screen printing in Colorado Springs, ${swash("done here")}.</h1>
    <p class="lead">Custom shirts, hoodies, hats and embroidery for teams, businesses, churches and events — printed in our own ${esc(SHOP.city)} shop, and a real person answers when you call. Send your logo and see it on the shirt in ${FACTS.mockupWithin} — free, no obligation.</p>
    ${ctaRow("hero", { onPage: true })}
    ${reassure(REASSURANCE)}
    <div class="hero-proof">${ratingLink("hero_rating")}</div>
  </div>
  ${heroArt()}
</div></section>`;

  const strip = `<section class="section--tight"><div class="container">${localStrip("home_strip")}</div></section>` + offerTile("home_offer", { onPage: true });

  const audiences = `<section class="section--tight"><div class="container">${ticker("We print for", HOME_AUDIENCES)}</div></section>`;

  const lines = Object.fromEntries(Object.entries(SERVICE_PAGES).map(([k, v]) => [k, v.tile]));
  const services = `<section class="section section--flush-top" aria-labelledby="services-title"><div class="container">
  ${sectionHead("services-title", "What we *print*.", "Every job is printed or stitched in our shop — so we can tell you exactly how it'll come out.", { aside: textLink("/dtf-vs-screen-printing", "Which method is right?", "services_methods") })}
  <div class="doodled">${doodle("burst", "section-doodle section-doodle--burst", " data-appear")}${serviceTiles(lines)}</div>
</div></section>`;

  const rules = `<section class="section" id="rules" aria-labelledby="rules-title"><div class="container">${rulesTile("rules-title", { onPage: true })}</div></section>`;

  const how = `<section class="section section--sand" id="how" aria-labelledby="how-title"><div class="container">
  ${sectionHead("how-title", "How an order *works*.", "Your price instantly, a free mockup in about 10 minutes, your order started the same day — and nothing prints until you approve it.")}
  <div class="doodled">${doodle("loop", "section-doodle section-doodle--loop", " data-appear")}${stepsList()}</div>
  ${ctaRow("after_steps", { onPage: true })}
</div></section>`;

  const proof = `<section class="section" aria-labelledby="proof-title"><div class="container">${proofSection("proof-title", "What customers *say*.", { onPage: true })}</div></section>`;

  const owner = `<section class="section section--sand" aria-labelledby="owner-title"><div class="container">${ownerSection("owner-title", { onPage: true })}</div></section>`;

  const work = `<section class="section" aria-labelledby="work-title"><div class="container">
  ${sectionHead("work-title", "Printed in our shop, not a *warehouse*.", "Real orders from our presses.", { aside: textLink("/gallery", "See more of our work", "work_gallery") })}
  <div class="doodled">${doodle("strokes", "section-doodle section-doodle--strokes", " data-appear")}${galleryGrid(recentWork(HOME_WORK, 6))}</div>
</div></section>`;

  const groups = `<section class="section section--sand" aria-labelledby="groups-title"><div class="container">
  ${sectionHead("groups-title", "Ordering for a *group*?", "Three ways to do it — pick the one that fits how your group pays.")}
  <ul class="features">
    <li class="card feature" data-appear>${icon("package")}<h3 class="h4">One order, delivered together</h3><p>You collect sizes and we print the lot — local pickup or we ship it. Best for teams, staff and events.</p>${textLink("#quote", "See Your Price Instantly", "groups_quote")}</li>
    <li class="card feature" data-appear>${icon("storefront")}<h3 class="h4">Everyone pays for their own</h3><p>A free online store where each person picks a size and pays. We print and ship every order — no collecting cash.</p>${textLink("/print-on-demand", "How group stores work", "groups_store")}</li>
    <li class="card feature" data-appear>${icon("handHeart")}<h3 class="h4">Raise money with shirts</h3><p>Set a price above the cost and the difference goes to your cause, with a store your supporters order from.</p>${textLink("/fundraising", "Fundraiser stores", "groups_fundraiser")}</li>
  </ul>
</div></section>`;

  const areas = `<section class="section" aria-labelledby="areas-title"><div class="container">
  ${sectionHead("areas-title", "Across the *Pikes Peak* region.", `Printed in ${SHOP.city}. ${FACTS.pickup}, or we'll ship to you.`, { aside: textLink("/service-areas", "All service areas", "areas_all") })}
  ${areasList(ctx.areas.close)}
</div></section>`;

  const faq = `<section class="section section--sand" id="faq" aria-labelledby="faq-title"><div class="container">
  ${sectionHead("faq-title", "Straight *answers*.", undefined, { aside: textLink("/faq", "All questions", "faq_all") })}
  ${faqList(HOME_FAQ)}
</div></section>`;

  const quote = quoteBand({ plain: true });

  const ld = ldScript({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE.origin}/#business`,
    name: SHOP.name,
    url: SITE.origin,
    logo: `${SITE.origin}/assets/brand/ark-logo-120.png`,
    image: `${SITE.origin}${PHOTOS.press.src}`,
    description: "Custom screen printing, DTF printing, and embroidery in Colorado Springs. No minimum orders, done in-house at ARK Screen Printing.",
    telephone: SHOP.phoneDisplay,
    email: SHOP.email,
    priceRange: "$$",
    address: { "@type": "PostalAddress", streetAddress: SHOP.street, addressLocality: SHOP.city, addressRegion: SHOP.region, postalCode: SHOP.postcode, addressCountry: "US" },
    geo: { "@type": "GeoCoordinates", ...SHOP.geo },
    openingHoursSpecification: { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "07:30", closes: "19:00" },
    hasMap: SHOP.mapsUrl,
    sameAs: SHOP.sameAs,
    areaServed: { "@type": "City", name: SHOP.city },
  }) + ldScript({ "@context": "https://schema.org", "@type": "WebSite", name: SHOP.name, url: SITE.origin }) + faqJsonLd(HOME_FAQ);

  return {
    title: ctx.page.title,
    description: ctx.page.description,
    canonical: `${SITE.origin}/`,
    robots: null,
    ogImage: `${SITE.origin}${PHOTOS.press.src}`,
    chrome: "full",
    current: "home",
    hasQuote: true,
    page: "home",
    jsonLd: ld,
    main: hero + strip + audiences + services + rules + how + proof + owner + work + groups + areas + faq + quote,
  };
}

import fs from "node:fs";
import { APP, FACTS, SHOP, SITE } from "../lib/facts.mjs";
import { accent, esc } from "../lib/html.mjs";
import { icon } from "../lib/icons.mjs";
import { picture } from "../lib/images.mjs";
import { PHOTOS, WORK } from "../lib/media.mjs";
import {
  ctaBand, ctaRow, faqList, finalCta, galleryGrid, recentWork, localStrip, ownerSection, proofSection, quoteBand, REASSURANCE, reassure,
  sectionHead, textLink,
} from "../lib/components.mjs";
import { abs, pageHero, pageJsonLd } from "./parts.mjs";

// About, FAQ, gallery, reviews, service areas, the quote page and thank-you.

const GALLERY = JSON.parse(fs.readFileSync(new URL("../content/gallery.json", import.meta.url), "utf8"));
const CONVERSIONS = JSON.parse(fs.readFileSync(new URL("../content/thank-you-conversions.json", import.meta.url), "utf8"));

const base = (page, extra) => ({
  title: page.title,
  description: page.description,
  canonical: page.canonical,
  robots: page.robots,
  chrome: "full",
  hasQuote: false,
  page: page.slug,
  jsonLd: pageJsonLd(page),
  ...extra,
});

export function renderAbout(ctx) {
  const { page } = ctx;
  // The owner's story, migrated. Two lines are scoped for accuracy (owner to
  // confirm — knowledge base roadmap D-q): an unsupported superlative, and
  // "all prints by hand", which isn't true of DTF orders.
  const story = page.blocks.map((b) => b.html).join("")
    .replace("Over time, this grew into the strongest national screen printing studio in the U.S.", "Over time, this grew into a full screen printing studio.")
    .replace("All our prints are made by hand on manual equipment.", "Our screen prints are pulled by hand on manual presses.")
    .replace(/<img src="\/images\/alex-signature\.png"[^>]*>/, '<img class="signature" src="/images/alex-signature.png" width="320" height="120" alt="Alex R. Kinnaman signature" loading="lazy">');
  const hero = pageHero({ h1: page.hero.h1, lead: page.hero.lead[0], photo: PHOTOS.press, crumbs: [{ name: "Home", href: "/" }, { name: "About" }] });
  const strip = `<section class="section--tight"><div class="container">${localStrip("about_strip")}</div></section>`;
  const owner = `<section class="section" aria-labelledby="owner-title"><div class="container">${ownerSection("owner-title", { more: false })}</div></section>`;
  const body = `<section class="section section--sand"><div class="container"><div class="prose">${story}</div></div></section>`;
  const proof = `<section class="section" aria-labelledby="proof-title"><div class="container">${proofSection("proof-title", "What customers *say*.")}</div></section>`;
  const work = `<section class="section section--sand" aria-labelledby="work-title"><div class="container">${sectionHead("work-title", "Real work from our *presses*.", undefined, { aside: textLink("/gallery", "See the gallery", "about_gallery") })}${galleryGrid(recentWork(WORK, 6))}</div></section>`;
  const closing = finalCta("Let's print *yours*.", "Tell us what you need — we reply within ten minutes during business hours and send a proof before anything prints.");
  return base(page, { current: "about", ogImage: abs(PHOTOS.owner.src), main: hero + strip + owner + body + proof + work + closing });
}

export function renderFaq(ctx) {
  const { page } = ctx;
  const items = page.blocks.flatMap((b) => b.faq).map((f) => ({ q: f.q, html: f.a }));
  const half = Math.ceil(items.length / 2);
  const hero = pageHero({ h1: page.hero.h1, lead: page.hero.lead[0], crumbs: [{ name: "Home", href: "/" }, { name: "FAQ" }] });
  const list = `<section class="section"><div class="container">${faqList(items.slice(0, half))}</div></section>` + ctaBand("faq_mid") + `<section class="section"><div class="container">${faqList(items.slice(half))}</div></section>`;
  const ask = `<section class="section section--sand"><div class="container"><div class="tile tile--sky" data-appear>
  <h2 class="h3">${accent("Didn't find your *answer*?")}</h2>
  <p style="margin-top:12px">Call or text ${esc(SHOP.phoneDisplay)} (${esc(SHOP.hours)}) or email <a href="mailto:${esc(SHOP.email)}">${esc(SHOP.email)}</a> — a person at the shop answers.</p>
  ${ctaRow("faq_ask")}
</div></div></section>`;
  return base(page, { current: "faq", main: hero + list + ask });
}

export function renderGallery(ctx) {
  const { page } = ctx;
  const hero = pageHero({ h1: page.hero.h1, lead: page.hero.lead[0], crumbs: [{ name: "Home", href: "/" }, { name: "Our work" }] });
  const all = recentWork(GALLERY);
  const grid = `<section class="section"><div class="container">${galleryGrid(all.slice(0, 9), { lightbox: true })}</div></section>` + ctaBand("gallery_mid", { title: "Like what you see?" }) + `<section class="section"><div class="container">${galleryGrid(all.slice(9), { lightbox: true, dialog: false })}</div></section>`;
  const closing = finalCta("Your logo, *printed here*.", "Send your artwork or an idea — we reply within ten minutes during business hours and send a proof before anything prints.");
  return base(page, { current: "gallery", ogImage: abs(PHOTOS.press.src), main: hero + grid + closing });
}

export function renderTestimonials(ctx) {
  const { page } = ctx;
  const hero = pageHero({ h1: page.hero.h1, lead: page.hero.lead[0], crumbs: [{ name: "Home", href: "/" }, { name: "Reviews" }] });
  // The reviews as the owner's reference shows them: the rating, the heading,
  // then the two-row ticker, live from Google via the Starwall feed
  // (REVIEWS_FEED) until the Business Profile sync takes over.
  const list = `<section class="section" aria-labelledby="reviews-title"><div class="container">${proofSection("reviews-title", "What customers *say*.", { live: true, leaveReview: true, note: `Recent Google reviews of our ${SHOP.city} print shop — why customers choose us, and what to expect.` })}</div></section>`;
  const closing = finalCta("Be our next *five stars*.", "Tell us what you need — we reply within ten minutes during business hours and send a proof before anything prints.");
  return base(page, { current: "testimonials", main: hero + list + closing });
}

export function renderServiceAreas(ctx) {
  const { page } = ctx;
  const hero = pageHero({ h1: page.hero.h1, lead: page.hero.lead[0], crumbs: [{ name: "Home", href: "/" }, { name: "Service areas" }] });
  const card = (a) => `<li><a class="card" href="/${esc(a.slug)}" style="display:grid;gap:6px;height:100%;text-decoration:none" data-appear><span class="h4">${esc(a.name)}</span>${a.blurb ? `<span class="muted" style="font-size:.9375rem">${esc(a.blurb)}</span>` : ""}<span class="text-link" style="margin-top:6px">Screen printing in ${esc(a.name)} ${icon("arrowRight")}</span></a></li>`;
  const grid = (list) => `<ul class="features" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">${list.map(card).join("")}</ul>`;
  const close = `<section class="section" aria-labelledby="close-title"><div class="container">${sectionHead("close-title", "Close-in *Colorado Springs* areas.", "ARK is based in Colorado Springs; these are focused local-service pages, not separate store locations.")}${grid(ctx.areas.close)}</div></section>`;
  const towns = `<section class="section section--sand" aria-labelledby="towns-title"><div class="container">${sectionHead("towns-title", "Additional communities we *serve*.", `${FACTS.pickup}, or we ship to you.`)}${grid(ctx.areas.towns)}</div></section>`;
  const closing = finalCta("Wherever you are in the *region*.", "Every order is printed in our Colorado Springs shop — we reply within ten minutes during business hours and send a proof before anything prints.");
  return base(page, { current: "service-areas", main: hero + close + ctaBand("areas_mid", { title: "Wherever you are in the region." }) + towns + closing });
}

export function renderQuote(ctx) {
  const { page } = ctx;
  const hero = `<section class="page-hero" aria-labelledby="page-title"><div class="container">
  <h1 id="page-title" class="h1">${accent("See your price, *instantly*.")}</h1>
  <p class="lead">About two minutes — your price shows as you go. Then a free mockup of your design on the garment in ${esc(FACTS.mockupWithin)} (${esc(FACTS.replyHours)}), with no obligation. Printing can start ${esc(FACTS.printStart)}.</p>
  ${reassure(REASSURANCE)}
</div></section>`;
  const quote = quoteBand({ eager: true, title: "Your *project*.", intro: "Garment, quantity, print locations, artwork and your date — whatever you know so far is enough to start." });
  const proof = `<section class="section" aria-labelledby="proof-title"><div class="container">${proofSection("proof-title", "What customers *say*.", { onPage: true })}</div></section>`;
  return base(page, { current: "none", hasQuote: true, main: hero + quote + proof });
}

export function renderThankYou(ctx) {
  const { page } = ctx;
  const main = `<section class="page-hero"><div class="container narrow">
  <h1 class="h1">${accent("Thank you — we've got your *request*.")}</h1>
  <p class="lead">We'll be in touch within ${esc(FACTS.replyWithin)} (${esc(FACTS.replyHours)}) with your free mockup — no obligation.</p>
</div></section>
<section class="section section--sand"><div class="container narrow">
  <h2 class="h3" style="margin-bottom:20px">What happens next</h2>
  <ol class="next-steps">
    <li><span><b>We're in touch</b>A call or text within ${esc(FACTS.replyWithin)} — and an email if we miss you — to confirm the details.</span></li>
    <li><span><b>Your free mockup</b>Your design on the garment, usually within ${esc(FACTS.mockupWithin)}. Rough artwork? We'll clean it up free.</span></li>
    <li><span><b>Printing</b>Approve the proof and pay the invoice, and printing can start ${esc(FACTS.printStart)}.</span></li>
  </ol>
  <div class="quote-alt" style="margin-top:28px"><b>Questions in the meantime?</b><a href="${esc(SHOP.phoneHref)}">Call</a> or <a href="${esc(SHOP.smsHref)}">text</a> ${esc(SHOP.phoneDisplay)} · <a href="mailto:${esc(SHOP.email)}">${esc(SHOP.email)}</a></div>
  <div class="cta-row"><a class="btn btn--ghost" href="/">Back to the home page</a><a class="btn btn--ghost" href="/gallery">See our work</a></div>
</div></section>`;
  // The Google Ads conversion snippets, byte for byte from the old page.
  const head = CONVERSIONS.map((s) => `<script>\n  ${s}\n</script>`).join("\n");
  return base(page, { current: "none", head, main, sticky: false });
}

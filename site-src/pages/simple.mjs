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
import { FAQ_GROUPS, FAQ_ITEMS } from "../content/faq.mjs";

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

/** The owner's story (migrated from the old About page), set in the site's
 *  own sections rather than one block of text (owner, 2026-10-16). The words
 *  are the owner's; two lines stay scoped for accuracy (owner to confirm —
 *  knowledge base roadmap D-q): no "strongest national studio" superlative,
 *  and the screen prints, not every print, are pulled by hand. */
const ABOUT = {
  intro: [
    "ARK Screen Printing Studio is a small, craft-centered print shop based out of Colorado Springs, CO. We got into this industry because we wanted to print our own clothes. Over time, this grew into a full screen printing studio.",
    "Printmaking is a traditional craft which finds origin in ancient China. Screen printing as we know today really comes into form in the early 20th century and of course gains massive popularity with Andy Warhol's photographic screen prints. We see ourselves as active participants in this tradition and thus are committed to the human process in everything we do.",
  ],
  story: "I started ARK Screen Printing as an organic outgrowth of my original desire to learn printmaking. While doing my own prints, people started asking me if I could do prints for them as well and this eventually blossomed into ARK Screen Printing Studio. What I love about this industry is it is an authentic service. I've had the opportunity to legitimately touch people's lives through the work we do here.",
  quote: "Relationships, like printmaking, are made richer when we make time.",
  why: "When you work with us, you receive genuine human connection, creativity, and just good business.",
  reasons: [
    { icon: "printer", title: "Pulled by hand", text: "Our screen prints are pulled by hand on manual presses." },
    { icon: "usersThree", title: "Genuine craftspeople", text: "The whole team here at ARK Screen Printing are treated as they ought to be: genuine craftspeople." },
    { icon: "handHeart", title: "Relationships that matter", text: "This appreciation for human creativity and analog processes transfers into our highly valued client relationships." },
  ],
  letter: ["Ultimately, it is your choice who you decide to work with on your next project.", "But I believe what we do here at ARK Screen Printing is without compare."],
};

export function renderAbout(ctx) {
  const { page } = ctx;
  const hero = pageHero({ h1: page.hero.h1, lead: page.hero.lead[0], photo: PHOTOS.press, crumbs: [{ name: "Home", href: "/" }, { name: "About" }] });
  const strip = `<section class="section--tight"><div class="container">${localStrip("about_strip")}</div></section>`;
  const owner = `<section class="section" aria-labelledby="owner-title"><div class="container">${ownerSection("owner-title", { more: false })}</div></section>`;
  const intro = `<section class="section section--sand" aria-labelledby="craft-title"><div class="container"><div class="split about-split">
  <div data-appear>
    <p class="kicker">Our story</p>
    <h2 id="craft-title" class="h2">${accent("Committed to the *human* process.")}</h2>
    ${ABOUT.intro.map((p, i) => `<p class="${i ? "" : "lead "}about-p">${esc(p)}</p>`).join("")}
  </div>
  <figure class="photo about-photo" data-appear>${picture(PHOTOS.screen.src, { alt: PHOTOS.screen.alt, sizes: "(min-width: 900px) 520px, 90vw" })}</figure>
</div></div></section>`;
  const story = `<section class="section" aria-labelledby="story-title"><div class="container"><div class="split about-split about-split--flip">
  <figure class="photo about-photo" data-appear>${picture(PHOTOS.boxed.src, { alt: PHOTOS.boxed.alt, sizes: "(min-width: 900px) 520px, 90vw" })}</figure>
  <div data-appear>
    <h2 id="story-title" class="h2">${accent("The ARK *story*.")}</h2>
    <p class="lead about-p">${esc(ABOUT.story)}</p>
    <blockquote class="pull-quote">${esc(ABOUT.quote)}</blockquote>
  </div>
</div></div></section>`;
  const why = `<section class="section section--sand" aria-labelledby="why-title"><div class="container">
  ${sectionHead("why-title", "Why choose *ARK*?", ABOUT.why)}
  <ul class="features">${ABOUT.reasons.map((r) => `<li class="card feature" data-appear>${icon(r.icon)}<h3 class="h4">${esc(r.title)}</h3><p>${esc(r.text)}</p></li>`).join("")}</ul>
</div></section>`;
  const letter = `<section class="section" aria-label="A note from the owner"><div class="container"><figure class="letter" data-appear>
  <blockquote>${ABOUT.letter.map((p) => `<p>${esc(p)}</p>`).join("")}</blockquote>
  <figcaption><span>— Alex R. Kinnaman, owner</span><img class="signature" src="/images/alex-signature.png" width="320" height="120" alt="Alex R. Kinnaman's signature" loading="lazy" decoding="async"></figcaption>
</figure></div></section>`;
  const proof = `<section class="section section--sand" aria-labelledby="proof-title"><div class="container">${proofSection("proof-title", "What customers *say*.")}</div></section>`;
  const work = `<section class="section" aria-labelledby="work-title"><div class="container">${sectionHead("work-title", "Real work hot off the *press*.", undefined, { aside: textLink("/gallery", "See the gallery", "about_gallery") })}${galleryGrid(recentWork(WORK, 6))}</div></section>`;
  const closing = finalCta("Let's print *yours*.", "Tell us what you need — we reply within ten minutes during business hours and send a proof before anything prints.");
  return base(page, { current: "about", ogImage: abs(PHOTOS.owner.src), main: hero + strip + owner + intro + story + why + letter + proof + work + closing });
}

/** The shop's FAQ (content/faq.mjs), in groups. The page's migrated questions
 *  were the online designer's; its title, description and heading stay. */
export function renderFaq(ctx) {
  const { page } = ctx;
  const hero = pageHero({ h1: page.hero.h1, lead: page.hero.lead[0], crumbs: [{ name: "Home", href: "/" }, { name: "FAQ" }] });
  const group = (g) => `<div class="faq-group" data-appear><h2 class="h3">${esc(g.title)}</h2>${faqList(g.items)}</div>`;
  const half = Math.ceil(FAQ_GROUPS.length / 2);
  const list = `<section class="section"><div class="container narrow">${FAQ_GROUPS.slice(0, half).map(group).join("")}</div></section>` + ctaBand("faq_mid") + `<section class="section"><div class="container narrow">${FAQ_GROUPS.slice(half).map(group).join("")}</div></section>`;
  const ask = `<section class="section section--sand"><div class="container"><div class="tile tile--sky" data-appear>
  <h2 class="h3">${accent("Didn't find your *answer*?")}</h2>
  <p style="margin-top:12px">Call or text ${esc(SHOP.phoneDisplay)} (${esc(SHOP.hours)}) or email <a href="mailto:${esc(SHOP.email)}">${esc(SHOP.email)}</a> — a real person at ARK answers.</p>
  ${ctaRow("faq_ask")}
</div></div></section>`;
  // Google's FAQ data follows the questions on the page, not the migrated ones.
  const jsonLd = pageJsonLd({ ...page, jsonLd: page.jsonLd.filter((j) => j["@type"] !== "FAQPage") }, FAQ_ITEMS);
  return base(page, { current: "faq", jsonLd, main: hero + list + ask });
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
  <p class="lead">About two minutes — your price shows as you go. Send it and we'll call you within ${esc(FACTS.callWithin)}; ${esc(FACTS.mockupAfterCall)} after that call, a free mockup of your design on the garment is in your inbox (${esc(FACTS.replyHours)}). No obligation — approve it and we start your order ${esc(FACTS.printStart)}.</p>
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
  <p class="lead">We'll call you within ${esc(FACTS.callWithin)} (${esc(FACTS.replyHours)}), and your free mockup follows ${esc(FACTS.mockupAfterCall)} after that call — no obligation.</p>
</div></section>
<section class="section section--sand"><div class="container narrow">
  <h2 class="h3" style="margin-bottom:20px">What happens next</h2>
  <ol class="next-steps">
    <li><span><b>We call you</b>Within ${esc(FACTS.callWithin)} — and a text or email if we miss you — to confirm the details.</span></li>
    <li><span><b>Your free mockup</b>Your design on the garment, ${esc(FACTS.mockupAfterCall)} after that call. Rough artwork? We'll clean it up free.</span></li>
    <li><span><b>We start the same day</b>Approve the proof and pay the invoice, and we start your order that day — ${esc(FACTS.sameDayWork)}. Most screen-print orders are ready in ${esc(FACTS.turnaround.screen)}.</span></li>
  </ol>
  <div class="quote-alt" style="margin-top:28px"><b>Questions in the meantime?</b><a href="${esc(SHOP.phoneHref)}">Call</a> or <a href="${esc(SHOP.smsHref)}">text</a> ${esc(SHOP.phoneDisplay)} · <a href="mailto:${esc(SHOP.email)}">${esc(SHOP.email)}</a></div>
  <div class="cta-row"><a class="btn btn--ghost" href="/">Back to the home page</a><a class="btn btn--ghost" href="/gallery">See our work</a></div>
</div></section>`;
  // The Google Ads conversion snippets, byte for byte from the old page.
  const head = CONVERSIONS.map((s) => `<script>\n  ${s}\n</script>`).join("\n");
  return base(page, { current: "none", head, main, sticky: false });
}

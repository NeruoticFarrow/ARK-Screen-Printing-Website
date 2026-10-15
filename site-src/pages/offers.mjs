import { APP, FACTS, SHOP, SITE, STORES } from "../lib/facts.mjs";
import { accent, esc, ldScript } from "../lib/html.mjs";
import { icon } from "../lib/icons.mjs";
import { picture } from "../lib/images.mjs";
import { PHOTOS, WORK } from "../lib/media.mjs";
import {
  ctaBand, ctaRow, faqJsonLd, faqList, galleryGrid, localStrip, proofSection, quoteBand, REASSURANCE, reassure,
  ratingLink, rulesTile, sectionHead, stepsList, textLink, ticker,
} from "../lib/components.mjs";
import { pageHero } from "./parts.mjs";

// Two offer pages added 2026-10-15 (owner request):
//  · /print-on-demand — sell online with no inventory; routes to the ARK
//    Creator Platform (/studio), where stores are opened.
//  · /fundraising — a landing page for fundraisers (schools, PTOs, boosters,
//    nonprofits, churches): a bulk order to sell at your event, or an online
//    fundraiser store. Built on knowledge base chapter 21 (organiser pages):
//    who pays, a timeline back from the date, logo permission, honest money.
// Every fact comes from facts.mjs (STORES mirrors the platform's policy).

/** While store sign-up is invite-only (STORES.signupOpen false), say so under
 *  every store button so nobody plans around a store they can't open yet. */
const storeNote = () => (STORES.signupOpen ? "" : `<p class="cta-note">The store platform is invite-only while we finish testing — you'll request an invite on the next page.</p>`);

const runRule = () => {
  const [a, b] = STORES.screenColours;
  return `${a.from}+ orders in a run are screen printed when the art fits the colour limits (up to ${a.colours} colours from ${a.from}, up to ${b.colours} from ${b.from}); otherwise they're DTF printed. Campaign orders print after the closing date, within ${STORES.campaignPrintDays} business days of the blanks arriving, then ship.`;
};
const payoutRule = () => `Earnings become available ${STORES.payoutAfterShipDays} days after an order ships and are paid by PayPal once a month when you have $${STORES.minimumPayoutUsd} or more. A W-9 is needed once payouts pass the IRS reporting threshold.`;

const studioButton = (placement, label, o = {}) =>
  `<a class="btn ${o.onDark ? "btn--accent" : o.ghost ? "btn--ghost" : "btn--primary"} btn--lg" href="${APP.studio}" data-cta="${esc(placement)}">${esc(label)} ${icon("arrowRight")}</a>`;

const breadcrumbLd = (name, slug) => ldScript({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE.origin },
    { "@type": "ListItem", position: 2, name, item: `${SITE.origin}/${slug}` },
  ],
});
const serviceLd = (name, description, slug) => ldScript({
  "@context": "https://schema.org",
  "@type": "Service",
  name,
  description,
  url: `${SITE.origin}/${slug}`,
  areaServed: { "@type": "City", name: SHOP.city },
  provider: { "@type": "LocalBusiness", name: SHOP.name, telephone: SHOP.phoneDisplay, address: { "@type": "PostalAddress", streetAddress: SHOP.street, addressLocality: SHOP.city, addressRegion: SHOP.region, postalCode: SHOP.postcode, addressCountry: "US" } },
});

export const POD_FAQ = [
  { q: "Does it cost anything to open a store?", a: ["No. A store is $0 to open, with no monthly fee and no listing fee. Each sale has a base — the blank, the print, packing and our margin — and everything you charge above it is yours."] },
  { q: "Who prints and ships the orders?", a: [`We do, in our ${SHOP.city} shop. Print-on-demand orders ship within ${STORES.onDemandShipDays} business days, with tracking (carrier time is extra). Store-order shipping is $${STORES.shippingFlatUsd.toFixed(2)} flat and free over $${STORES.freeShippingOverUsd}, US addresses only.`] },
  { q: "How do I get paid?", a: [payoutRule()] },
  { q: "Can I sell a limited run instead?", a: [`Yes. Run a campaign with a closing date and we print the whole run together. ${runRule()} Every order prints either way.`] },
  { q: "What do my buyers get?", a: [`Tracking on every order, free size exchanges within ${STORES.sizeExchangeDays} days and defects made right within ${STORES.defectDays} days of delivery.`] },
  { q: "Would a bulk order suit me better?", a: [`If you'd rather buy upfront — for an event, a team or staff — a bulk order gives the lowest price per shirt (screen printing from ${FACTS.screenFrom}). <a href="/get-a-quote#quote">See Your Price Instantly</a>.`] },
];

export function renderPrintOnDemand() {
  const slug = "print-on-demand";
  const title = "Print on Demand Colorado Springs | ARK Screen Printing";
  const description = `Print on demand from a real Colorado Springs print shop: open a free store, set your price, and we print every order and ship it within ${STORES.onDemandShipDays} business days. No inventory, no upfront cost.`;
  const hero = `<section class="page-hero" aria-labelledby="page-title"><div class="container hero-grid">
  <div>
    <nav aria-label="Breadcrumb"><ol class="crumbs"><li><a href="/">Home</a></li><li><span aria-current="page">Print on demand</span></li></ol></nav>
    <p class="kicker eyebrow">No inventory · no upfront cost</p>
    <h1 id="page-title" class="h1">${accent("Print on demand, from a *real* print shop.")}</h1>
    <p class="lead">Open a free online store, put your designs on tees and hoodies, and set your price. Every order is printed in our ${esc(SHOP.city)} shop and shipped to your buyer — you keep everything above the base.</p>
    <div class="cta-row">${studioButton("hero_studio", "Start your store")}<a class="btn btn--ghost btn--lg" href="/get-a-quote#quote" data-cta="hero_quote">See Your Price Instantly</a></div>
    ${storeNote()}
    ${reassure(["$0 to open", "No monthly or listing fees", "Printed in Colorado Springs"])}
  </div>
  <figure class="hero-photo-card">${picture(PHOTOS.folded.src, { alt: PHOTOS.folded.alt, sizes: "(min-width: 960px) 560px, 92vw", priority: true })}</figure>
</div></section>`;
  const strip = `<section class="section--tight"><div class="container">${localStrip("pod_strip")}</div></section>`;
  const audiences = `<section class="section--tight"><div class="container">${ticker("Made for", ["Bands & artists", "Clothing brands", "Creators", "Schools & teams", "Churches & clubs", "Small businesses", "Fundraisers"])}</div></section>`;
  const how = `<section class="section section--sand" aria-labelledby="how-title"><div class="container">
  ${sectionHead("how-title", "How print on demand *works*.", "You make the design and set the price. We print, pack, ship and look after your buyers.")}
  ${stepsList([
    { title: "Design your release", text: "Upload your art, place it on a garment and pick the colours you sell. The Studio shows the base before you set a price." },
    { title: "Share your store", text: "Your own store at your own link. A printer checks every file before a release goes live." },
    { title: "We print each order", text: `Printed in our ${SHOP.city} shop and shipped with tracking within ${STORES.onDemandShipDays} business days (US only).` },
    { title: "You get paid", text: "Everything above the base is yours, paid monthly by PayPal." },
  ])}
  <div class="cta-row">${studioButton("after_steps_studio", "Start your store")}${textLink(APP.studioHow, "The whole process", "pod_how")}</div>
</div></section>`;
  const why = `<section class="section" aria-labelledby="why-title"><div class="container">
  ${sectionHead("why-title", "Why sell with *ARK*.")}
  <ul class="features">
    <li class="card feature" data-appear>${icon("storefront")}<h3 class="h4">$0 to open</h3><p>No monthly fee and no listing fee. The base on each sale covers the blank, the print, packing and our margin.</p></li>
    <li class="card feature" data-appear>${icon("printer")}<h3 class="h4">Printed here, not a warehouse</h3><p>Every order is printed in our ${esc(SHOP.city)} shop — and you can call or text the people printing it.</p></li>
    <li class="card feature" data-appear>${icon("sealCheck")}<h3 class="h4">A printer checks every file</h3><p>Before a release goes live, a person at the shop reviews your file and tells you what to fix.</p></li>
    <li class="card feature" data-appear>${icon("shieldCheck")}<h3 class="h4">Buyers looked after</h3><p>Tracking on every order, free size exchanges within ${STORES.sizeExchangeDays} days and defects made right within ${STORES.defectDays}.</p></li>
  </ul>
</div></section>`;
  const compare = `<section class="section section--sand" aria-labelledby="compare-title"><div class="container">
  ${sectionHead("compare-title", "Print on demand or a *bulk order*?", "Both are printed in the same shop. Pick by who pays and when.")}
  <div class="prose prose--wide"><div class="table-scroll"><table>
    <thead><tr><th></th><th>Print on demand (a store)</th><th>Bulk order</th></tr></thead>
    <tbody>
      <tr><th>Who pays</th><td>Each buyer, online</td><td>You, upfront</td></tr>
      <tr><th>Inventory</th><td>None — each order is printed as it's placed</td><td>You receive the whole order</td></tr>
      <tr><th>Delivery</th><td>Shipped to each buyer within ${STORES.onDemandShipDays} business days (US only)</td><td>${esc(FACTS.pickup)}, or shipped to you</td></tr>
      <tr><th>Best for</th><td>Merch, brands, fans and supporters ordering their own size</td><td>Teams, staff and events with a date</td></tr>
      <tr><th>Price per shirt</th><td>You set the retail price above the base</td><td>Lowest at ${FACTS.screenFrom}+ (screen printing)</td></tr>
    </tbody>
  </table></div></div>
  <div class="cta-row">${studioButton("compare_studio", "Start your store")}<a class="btn btn--ghost btn--lg" href="/get-a-quote#quote" data-cta="compare_quote">See Your Price Instantly</a></div>
</div></section>`;
  const work = `<section class="section" aria-labelledby="work-title"><div class="container">${sectionHead("work-title", "Printed in our shop.", undefined, { aside: textLink("/gallery", "See more work", "pod_gallery") })}${galleryGrid(WORK.slice(0, 6))}</div></section>`;
  const proof = `<section class="section section--sand" aria-labelledby="proof-title"><div class="container">${proofSection("proof-title", "What our custom-print customers *say*.", { note: "Google reviews of the print shop that prints every store order." })}</div></section>`;
  const faq = `<section class="section" aria-labelledby="faq-title"><div class="container">${sectionHead("faq-title", "Straight *answers*.", undefined, { aside: textLink(APP.studioFaq, "Creator FAQ", "pod_faq") })}${faqList(POD_FAQ)}</div></section>`;
  const closing = `<section class="section" aria-labelledby="final-title"><div class="container"><div class="tile tile--navy on-dark closing" data-appear>
  <div><h2 id="final-title" class="h1">${accent("Open your *store*.")}</h2><p>Design a release, set your price and see what you'd keep — before anything goes on sale.</p></div>
  <div><div class="cta-row">${studioButton("final_studio", "Start your store", { onDark: true })}<a class="btn btn--ghost btn--lg" href="${esc(SHOP.phoneHref)}" data-cta="final_call">${icon("phone")}Call ${esc(SHOP.phoneDisplay)}</a></div>${storeNote()}</div>
</div></div></section>`;
  return {
    title, description,
    canonical: `${SITE.origin}/${slug}`,
    robots: null,
    ogImage: `${SITE.origin}${PHOTOS.folded.src}`,
    chrome: "full",
    current: slug,
    hasQuote: false,
    page: slug,
    stickyAction: { href: APP.studio, label: "Start your store", placement: "sticky_studio" },
    jsonLd: serviceLd("Print on demand", description, slug) + breadcrumbLd("Print on demand", slug) + faqJsonLd(POD_FAQ),
    main: hero + strip + audiences + how + why + ctaBand("pod_band", { title: "Prefer one bulk order?", text: `Screen printing starts at ${FACTS.screenFrom} shirts — get a price in about two minutes.` }) + compare + work + proof + faq + closing,
  };
}

export const FUNDRAISING_FAQ = [
  { q: "How does the money work?", a: [
    `<b>Bulk order:</b> you buy the shirts at our price and sell them at your price — the difference is your fundraiser. Screen printing starts at ${FACTS.screenFrom} shirts and gives the lowest price per shirt.`,
    `<b>Online store:</b> you set the price; each sale's base (the blank, the print, packing and our margin) comes out, and everything above it is earned by the store. Set your organisation's PayPal account as the payout method so the earnings go to the organisation. ${payoutRule()}`,
  ] },
  { q: "How far ahead should we start?", a: [`Give yourself about three weeks before your event: a day or two for the quote and proof, then most screen-print orders are done in ${FACTS.turnaround.screen}. Short on time? Call ${SHOP.phoneDisplay} — rush is often possible.`] },
  { q: "Can we use our school or team logo?", a: ["Yes, if you have permission to use it. Many schools, districts and leagues have a process for approving their logos and mascots — check before you order, and we'll print what's approved."] },
  { q: "Is there a minimum?", a: [`No minimum order. Screen printing starts at ${FACTS.screenFrom} shirts; smaller orders are printed with DTF. In an online store, every order prints.`] },
  { q: "What should we tell supporters?", a: ["Say plainly how much of each sale goes to your cause — for example, “$8 from every shirt funds the band trip” (an illustration: use your own numbers, and make sure they match the price you set)."] },
  { q: "Are purchases donations?", a: ["No. ARK sells and ships the shirts; we don't collect donations or issue tax receipts. Whether any part of a purchase is deductible is for your organisation to say — ask your accountant."] },
  { q: "Do you deliver?", a: [`${FACTS.pickup} in ${SHOP.city}, or we ship your order. With an online store, each supporter's order ships to them.`] },
];

export function renderFundraising() {
  const slug = "fundraising";
  const title = "Fundraiser Shirts Colorado Springs | ARK Screen Printing";
  const description = `Fundraiser shirts for schools, PTOs, booster clubs, nonprofits and churches in Colorado Springs — a bulk order to sell at your event, or a free online fundraiser store. Screen printing from ${FACTS.screenFrom}.`;
  const hero = pageHero({
    h1: "Fundraiser shirts for *schools*, teams and causes.",
    eyebrow: "Schools · PTOs · boosters · nonprofits · churches",
    lead: `Raise money with custom shirts and hoodies, printed in our ${SHOP.city} shop. Sell them at your event, or open a free online store where supporters order and pay for their own — no cash to collect, no boxes left over.`,
    photo: PHOTOS.boxed,
    onPage: true,
    crumbs: [{ name: "Home", href: "/" }, { name: "Fundraisers" }],
  });
  const strip = `<section class="section--tight"><div class="container">${localStrip("fund_strip")}</div></section>`;
  const who = `<section class="section--tight"><div class="container">${ticker("Made for", ["Schools & PTOs", "Booster clubs", "Sports teams", "Nonprofits", "Churches & youth groups", "Mission trips", "Bands & clubs", "Memorials & causes"])}</div></section>`;
  const ways = `<section class="section" aria-labelledby="ways-title"><div class="container">
  ${sectionHead("ways-title", "Two ways to *raise money*.", "Pick by how your supporters pay.")}
  <div class="ways">
    <div class="tile tile--navy on-dark" data-appear>
      <span class="label" style="color:var(--on-dark)">Option 1</span>
      <h3 class="h3" style="margin:6px 0 14px">Buy in bulk, sell at your event</h3>
      <ul class="checklist">
        <li>${icon("package")}<span><b>One order, one price</b><small>Screen printing from ${FACTS.screenFrom} shirts gives the lowest price per shirt.</small></span></li>
        <li>${icon("currencyDollar")}<span><b>You set the selling price</b><small>The difference between our price and yours is your fundraiser.</small></span></li>
        <li>${icon("calendarCheck")}<span><b>Ready for your date</b><small>Most screen-print orders in ${FACTS.turnaround.screen}. ${FACTS.pickup}.</small></span></li>
      </ul>
      <div class="cta-row">${`<a class="btn btn--accent btn--lg" href="#quote" data-cta="ways_quote">See Your Price Instantly ${icon("arrowRight")}</a>`}</div>
    </div>
    <div class="card" data-appear>
      <span class="label" style="color:var(--muted)">Option 2</span>
      <h3 class="h3" style="margin:6px 0 14px">An online fundraiser store</h3>
      <ul class="checklist">
        <li>${icon("storefront")}<span><b>$0 to open</b><small>No monthly or listing fees. Supporters pick a size and pay online.</small></span></li>
        <li>${icon("currencyDollar")}<span><b>Everything above the base is earned</b><small>Set your organisation's PayPal account as the payout method — paid monthly once earnings reach $${STORES.minimumPayoutUsd}.</small></span></li>
        <li>${icon("truck")}<span><b>We print and ship every order</b><small>No cash to collect, no leftover boxes. Run it with a closing date and the whole run prints after it closes — ${FACTS.screenFrom}+ in screen print when the art fits the colour limits.</small></span></li>
      </ul>
      <div class="cta-row">${studioButton("ways_studio", "Start a fundraiser store", { ghost: true })}</div>
      ${storeNote()}
    </div>
  </div>
</div></section>`;
  const timeline = `<section class="section section--sand" aria-labelledby="timeline-title"><div class="container">
  ${sectionHead("timeline-title", "Work back from your *date*.", "About three weeks is comfortable for a bulk order. Short on time? Call — rush is often possible.")}
  ${stepsList([
    { title: "About 3 weeks out: request your quote", text: `Garment, quantity, artwork and the date. We reply within ${FACTS.replyWithin} (${FACTS.replyHours}).` },
    { title: "Your proof, moments later", text: "A digital proof follows right after we talk — nothing prints until you approve it. Using a school or team logo? Have the permission ready." },
    { title: "Printing starts the same day", text: `Approve the proof and pay the invoice, and printing can start the same day — most screen-print orders are done in ${FACTS.turnaround.screen}.` },
    { title: "Sell it", text: `${FACTS.pickup}, or we ship. Tell supporters how much of each sale goes to your cause.` },
  ])}
  ${ctaRow("timeline", { onPage: true })}
</div></section>`;
  const rules = `<section class="section"><div class="container">${rulesTile("rules-title", { onPage: true })}</div></section>`;
  const proof = `<section class="section section--sand" aria-labelledby="proof-title"><div class="container">${proofSection("proof-title", "What customers *say*.", { onPage: true })}</div></section>`;
  const faq = `<section class="section" aria-labelledby="faq-title"><div class="container">${sectionHead("faq-title", "Organisers *ask*.")}${faqList(FUNDRAISING_FAQ)}</div></section>`;
  const quote = quoteBand({ title: "Get your fundraiser *quote*.", intro: `Tell us your group, the garment, the quantity and your date. We reply within ${FACTS.replyWithin} ${FACTS.replyHours.replace(/,.*/, "")}, and you approve a proof before anything prints.` });
  return {
    title, description,
    canonical: `${SITE.origin}/${slug}`,
    robots: null,
    ogImage: `${SITE.origin}${PHOTOS.team.src}`,
    chrome: "full",
    current: slug,
    hasQuote: true,
    page: slug,
    jsonLd: serviceLd("Fundraiser shirts", description, slug) + breadcrumbLd("Fundraisers", slug) + faqJsonLd(FUNDRAISING_FAQ),
    main: hero + strip + who + ways + timeline + ctaBand("fund_band", { onPage: true, title: "Planning a fundraiser?" }) + rules + proof + faq + quote,
  };
}

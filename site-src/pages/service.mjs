import { FACTS, SERVICES, SHOP } from "../lib/facts.mjs";
import { icon } from "../lib/icons.mjs";
import {
  areasList, audienceStrip, ctaBand, faqList, localStrip, offerTile, proofSection, quoteBand, rulesTile, sectionHead, stepsList, textLink, ctaRow,
} from "../lib/components.mjs";
import { PPC_PAGES, SERVICE_PAGES } from "../content/services.mjs";
import { abs, migratedBlocks, pageHero, pageJsonLd, pointsSection } from "./parts.mjs";

// Service pages (custom shirts, hoodies, embroidery, hats, screen printing,
// DTF, the hub and the comparison) and the paid-search pages (minimal chrome,
// noindex, one action, objections answered with the FAQ open, the form on the
// page, a phone sticky CTA).

const withIcons = (points) => points.map((p) => ({ ...p, iconHtml: icon(p.icon) }));

export function renderService(ctx) {
  const { page } = ctx;
  const own = SERVICE_PAGES[page.slug] ?? {};
  const label = SERVICES.find((s) => s.slug === page.slug)?.label ?? page.hero?.h1 ?? page.title;
  const photo = page.hero?.image ?? own.photo ?? null;
  const lead = page.hero?.lead?.[0] ?? own.lead ?? null;
  const migratedFaq = page.blocks.some((b) => b.faq.length);

  const hero = pageHero({
    h1: page.hero?.h1 ?? label,
    lead,
    photo,
    onPage: true,
    crumbs: [{ name: "Home", href: "/" }, { name: label }],
  });
  const strip = `<section class="section--tight"><div class="container">${localStrip("service_strip")}</div></section>` + offerTile("service_offer", { onPage: true });
  const points = own.points ? pointsSection(withIcons(own.points)) : "";
  const uses = own.uses ? audienceStrip() : "";
  const blocks = migratedBlocks(page.blocks, { startSand: !!own.points });
  const rules = `<section class="section"><div class="container">${rulesTile("rules-title", { onPage: true })}</div></section>`;
  const how = `<section class="section section--sand" aria-labelledby="how-title"><div class="container">
  ${sectionHead("how-title", "How an order *works*.", "Your price instantly. Your free mockup follows within 10 minutes of confirming the details with you. After you approve it and pay, we start your order the same day.")}
  ${stepsList()}
</div></section>`;
  const proof = `<section class="section" aria-labelledby="proof-title"><div class="container">${proofSection("proof-title", "What customers *say*.", { onPage: true })}</div></section>`;
  const faqItems = !migratedFaq && own.faq ? own.faq : [];
  const faq = faqItems.length
    ? `<section class="section section--sand" aria-labelledby="faq-title"><div class="container">${sectionHead("faq-title", "Straight *answers*.", undefined, { aside: textLink("/faq", "All questions", "faq_all") })}${faqList(faqItems)}</div></section>`
    : "";
  const areas = `<section class="section" aria-labelledby="areas-title"><div class="container">
  ${sectionHead("areas-title", `${label} across the *Pikes Peak* region.`, `Printed in ${SHOP.city}. ${FACTS.pickup}, or we ship.`, { aside: textLink("/service-areas", "All service areas", "areas_all") })}
  ${areasList(ctx.areas.close)}
</div></section>`;
  const quote = quoteBand({ intro: page.quoteIntro && !/^start your project$/i.test(page.quoteIntro) ? page.quoteIntro : undefined });

  return {
    title: page.title,
    description: page.description,
    canonical: page.canonical,
    robots: page.robots,
    ogImage: abs(photo?.src),
    chrome: "full",
    current: page.slug,
    hasQuote: true,
    page: page.slug,
    jsonLd: pageJsonLd(page, faqItems),
    main: hero + strip + points + uses + (points && page.blocks.length ? ctaBand("after_points", { onPage: true }) : "") + blocks + rules + how + proof + faq + areas + quote,
  };
}

export function renderPpc(ctx) {
  const { page } = ctx;
  const cfg = PPC_PAGES[page.slug];
  const svc = SERVICE_PAGES[cfg.service];
  const photo = page.hero?.image ?? cfg.photo ?? svc.photo;
  const pointsData = cfg.points ?? svc.points;
  const hero = pageHero({ h1: page.hero?.h1 ?? page.title, lead: page.hero?.lead?.[0], photo, onPage: true });
  const strip = `<section class="section--tight"><div class="container">${localStrip("ppc_strip")}</div></section>` + offerTile("ppc_offer", { onPage: true });
  const points = pointsSection(withIcons(pointsData), "Why order from *ARK*.");
  const uses = audienceStrip();
  const proof = `<section class="section section--sand" aria-labelledby="proof-title"><div class="container">${proofSection("proof-title", "What customers *say*.", { onPage: true })}</div></section>`;
  const rules = `<section class="section"><div class="container">${rulesTile("rules-title", { onPage: true })}</div></section>`;
  const how = `<section class="section section--sand" aria-labelledby="how-title"><div class="container">
  ${sectionHead("how-title", "How an order *works*.", "Your price instantly. Your free mockup follows within 10 minutes of confirming the details with you. After you approve it and pay, we start your order the same day.")}
  ${stepsList()}
  ${ctaRow("after_steps", { onPage: true })}
</div></section>`;
  // Objections answered without a click (FAQ open on paid pages).
  const faq = `<section class="section" aria-labelledby="faq-title"><div class="container">${sectionHead("faq-title", "Before you *ask*.")}${faqList(svc.faq, { open: true })}</div></section>`;
  const quote = quoteBand({ eager: true });

  return {
    title: page.title,
    description: page.description,
    canonical: page.canonical,
    robots: page.robots ?? "noindex",
    ogImage: abs(photo?.src),
    chrome: "minimal",
    current: "none",
    hasQuote: true,
    sticky: true,
    page: page.slug,
    jsonLd: pageJsonLd(page),
    main: hero + strip + points + uses + proof + rules + how + faq + quote,
  };
}

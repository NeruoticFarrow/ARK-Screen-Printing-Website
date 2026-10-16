import { SHOP } from "../lib/facts.mjs";
import { areasList, localStrip, offerTile, proofSection, quoteBand, rulesTile, sectionHead, stepsList, textLink } from "../lib/components.mjs";
import { abs, migratedBlocks, pageHero, pageJsonLd } from "./parts.mjs";

// Local landing pages (knowledge base chapter 25 §11.3, 12 §4.5): the page's
// own H1, lead and local copy (migrated unchanged), with local proof in plain
// sight, the rules, the process, reviews, nearby areas and the form.

export function renderLocal(ctx) {
  const { page, area } = ctx;
  const family = area.family === "close" ? ctx.areas.close : ctx.areas.towns;
  const hero = pageHero({
    h1: page.hero?.h1 ?? page.title,
    eyebrow: page.hero?.eyebrow ?? `Serving ${area.name}`,
    lead: page.hero?.lead?.[0],
    meta: page.hero?.meta,
    photo: page.hero?.image,
    caption: page.hero?.caption,
    onPage: true,
    crumbs: [{ name: "Home", href: "/" }, { name: "Service areas", href: "/service-areas" }, { name: area.name }],
  });
  const strip = `<section class="section--tight"><div class="container">${localStrip("local_strip")}</div></section>` + offerTile("local_offer", { onPage: true });
  const blocks = migratedBlocks(page.blocks);
  const rules = `<section class="section"><div class="container">${rulesTile("rules-title", { onPage: true })}</div></section>`;
  const how = `<section class="section section--sand" aria-labelledby="how-title"><div class="container">
  ${sectionHead("how-title", "How an order *works*.", `From your quote to your door in ${area.name} — and you see the proof first.`)}
  ${stepsList()}
</div></section>`;
  const proof = `<section class="section" aria-labelledby="proof-title"><div class="container">${proofSection("proof-title", "What customers *say*.", { onPage: true })}</div></section>`;
  const nearby = `<section class="section section--sand" aria-labelledby="nearby-title"><div class="container">
  ${sectionHead("nearby-title", "Nearby *areas*.", `All printed in our ${SHOP.city} shop.`, { aside: textLink("/service-areas", "All service areas", "nearby_all") })}
  ${areasList(family, page.slug)}
</div></section>`;
  const quote = quoteBand({ plain: true, intro: page.quoteIntro && !/^start your project$/i.test(page.quoteIntro) ? page.quoteIntro : undefined });

  return {
    title: page.title,
    description: page.description,
    canonical: page.canonical,
    robots: page.robots,
    ogImage: abs(page.hero?.image?.src),
    chrome: "full",
    current: "service-areas",
    hasQuote: true,
    page: page.slug,
    jsonLd: pageJsonLd(page),
    main: hero + strip + blocks + rules + how + proof + nearby + quote,
  };
}

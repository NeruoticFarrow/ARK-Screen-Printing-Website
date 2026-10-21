// Builds arkscreenprinting.com into ark-site-review/ (the folder Netlify
// publishes): every page from its content (site-src/content/) and template
// (site-src/pages/), plus assets/site.css and assets/site.js.
//
// usage: npm run build    (then npm run check)

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PPC_LINE, SHOP } from "./lib/facts.mjs";
import { shell } from "./lib/layout.mjs";
import { SITE_CSS } from "./lib/styles.mjs";
import { PPC_PAGES } from "./content/services.mjs";
import { renderHome } from "./pages/home.mjs";
import { renderFundraising, renderPrintOnDemand } from "./pages/offers.mjs";
import { renderLocal } from "./pages/local.mjs";
import { renderPpc, renderService } from "./pages/service.mjs";
import { renderAbout, renderFaq, renderGallery, renderQuote, renderServiceAreas, renderTestimonials, renderThankYou } from "./pages/simple.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const SITE_DIR = path.join(ROOT, "ark-site-review");
const CONTENT = path.join(ROOT, "site-src/content/pages");

const pages = Object.fromEntries(fs.readdirSync(CONTENT).map((f) => {
  const p = JSON.parse(fs.readFileSync(path.join(CONTENT, f), "utf8"));
  return [p.slug, p];
}));

// ── Areas: the close-in Colorado Springs pages and the outlying towns, named
// and described as the service-areas page published them.
const NAMES = { "denver-south": "South Denver", "canon-city": "Canon City", "broadmoor-colorado-springs": "Broadmoor", "downtown-colorado-springs": "Downtown Colorado Springs" };
const titleCase = (s) => s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
const areasHtml = pages["service-areas"].blocks.map((b) => b.html).join("");
const close = [...areasHtml.matchAll(/<a href="\/(screen-printing-[^"]+)"><strong>([^<]+)<\/strong>([^<]*)<\/a>/g)]
  .map(([, slug, name, blurb]) => ({ slug, name: name.trim(), blurb: blurb.trim(), family: "close" }));
const towns = [...areasHtml.matchAll(/<h4><a href="\/(screen-printing-[^"]+)">[^<]*<\/a><\/h4>\s*<p>([^<]*)<\/p>/g)]
  .map(([, slug, blurb]) => { const key = slug.replace(/^screen-printing-/, ""); return { slug, name: NAMES[key] ?? titleCase(key), blurb: blurb.trim(), family: "towns" }; })
  .filter((a, i, all) => all.findIndex((b) => b.slug === a.slug) === i && !close.some((c) => c.slug === a.slug));
const areas = { close, towns };
const areaBySlug = Object.fromEntries([...close, ...towns].map((a) => [a.slug, a]));

// ── Assets.
const bridge = fs.readFileSync(path.join(ROOT, "site-src/content/conversion-bridge.js"), "utf8").trim();
const js = fs.readFileSync(path.join(ROOT, "site-src/assets/site.js"), "utf8").replace("/* @@CONVERSION_BRIDGE@@ */", bridge);
const css = SITE_CSS.replace(/\n\s*/g, "\n").trim() + "\n";
const version = crypto.createHash("sha256").update(css + js).digest("hex").slice(0, 10);
fs.mkdirSync(path.join(SITE_DIR, "assets"), { recursive: true });
fs.writeFileSync(path.join(SITE_DIR, "assets/site.css"), css);
fs.writeFileSync(path.join(SITE_DIR, "assets/site.js"), js);

// ── Pages.
const SIMPLE = { about: renderAbout, faq: renderFaq, gallery: renderGallery, testimonials: renderTestimonials, "service-areas": renderServiceAreas, "get-a-quote": renderQuote, "thank-you": renderThankYou };
const SKIP = new Set(["service-areas-old-backup"]);
let count = 0;
const unrouted = [];
for (const page of Object.values(pages)) {
  if (SKIP.has(page.slug)) continue;
  const ctx = { page, areas, area: areaBySlug[page.slug] };
  let out;
  if (page.slug === "index") out = renderHome(ctx);
  else if (page.slug === "home-ppc") out = renderHome(ctx, { ppc: true });
  else if (SIMPLE[page.slug]) out = SIMPLE[page.slug](ctx);
  else if (PPC_PAGES[page.slug]) out = renderPpc(ctx);
  else if (areaBySlug[page.slug]) out = renderLocal(ctx);
  else if (/^(custom-|dtf-)/.test(page.slug)) out = renderService(ctx);
  else { unrouted.push(page.slug); continue; }
  let html = shell({ ...out, css: version });
  // A paid-search page shows its own line wherever the page shows a number.
  if (PPC_PAGES[page.slug]) {
    for (const key of ["phoneDisplay", "phoneHref", "smsHref"]) html = html.split(SHOP[key]).join(PPC_LINE[key]);
  }
  fs.writeFileSync(path.join(SITE_DIR, page.file), html);
  count++;
}
if (unrouted.length) throw new Error(`no template for: ${unrouted.join(", ")}`);

// Pages written for the redesign (no migrated content).
for (const [file, render] of [["print-on-demand.html", renderPrintOnDemand], ["fundraising.html", renderFundraising]]) {
  fs.writeFileSync(path.join(SITE_DIR, file), shell({ ...render(), css: version }));
  count++;
}

// ── Long cache for fingerprinted assets, fonts and optimised images.
fs.writeFileSync(path.join(SITE_DIR, "_headers"), `# Written by site-src/build.mjs.
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/gf/*
  Cache-Control: public, max-age=31536000, immutable
`);

console.log(`built ${count} pages · css ${(css.length / 1024).toFixed(1)} KB · js ${(js.length / 1024).toFixed(1)} KB · v=${version} · areas ${close.length} close + ${towns.length} towns`);

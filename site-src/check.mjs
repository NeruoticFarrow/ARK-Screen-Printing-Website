// Checks the built pages: one H1; every internal link, image, script and
// stylesheet resolves to a file (exact case — Netlify serves case-sensitively);
// no duplicate ids; structured data parses; analytics on every page; the
// paid pages stay noindex; thank-you keeps both conversion tags; and each
// page kept its migrated title, description, canonical and H1.
//
// usage: npm run check   (exit code 1 on any failure)

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { parseHTML } from "linkedom";
import { PPC_PAGES } from "./content/services.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const SITE = path.join(ROOT, "ark-site-review");
const CONTENT = path.join(ROOT, "site-src/content/pages");
const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);

const existsExact = (rel) => {
  let dir = SITE;
  for (const part of rel.split("/").filter(Boolean)) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory() || !fs.readdirSync(dir).includes(part)) return false;
    dir = path.join(dir, part);
  }
  return fs.existsSync(dir);
};
// Paths Netlify proxies to the app, read from _redirects (status 200 rules) —
// never assumed, so a link to a path with no rule fails the check.
const REWRITES = fs.readFileSync(path.join(SITE, "_redirects"), "utf8").split("\n")
  .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  .map((l) => l.split(/\s+/)).filter((p) => /^200!?$/.test(p[2] ?? ""))
  .map(([from]) => new RegExp(`^${from.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\/\*$/, "/.*")}$`));

function resolves(href) {
  const clean = decodeURIComponent(href.split("#")[0].split("?")[0]);
  if (!clean || clean === "/") return existsExact("index.html");
  if (REWRITES.some((r) => r.test(clean))) return true; // proxied to the app (_redirects / Netlify)
  const rel = clean.replace(/^\//, "");
  return existsExact(rel) || existsExact(`${rel}.html`);
}

let checked = 0;
// Migrated pages carry their content file; pages written for the redesign
// (print-on-demand, fundraising) get every check except "unchanged from before".
const sources = Object.fromEntries(fs.readdirSync(CONTENT).map((f) => { const s = JSON.parse(fs.readFileSync(path.join(CONTENT, f), "utf8")); return [s.file, s]; }));
const generated = fs.readdirSync(SITE).filter((f) => f.endsWith(".html") && /name="generator" content="ark-site-src"/.test(fs.readFileSync(path.join(SITE, f), "utf8")));
for (const file of Object.keys(sources)) if (file !== "service-areas-old-backup.html" && !generated.includes(file)) fail(file, "not generated");
for (const genFile of generated) {
  const src = sources[genFile] ?? { file: genFile, slug: genFile.replace(/\.html$/, ""), new: true, jsonLd: [] };
  const html = fs.readFileSync(path.join(SITE, src.file), "utf8");
  const { document: d } = parseHTML(html);
  const file = src.file;
  checked++;

  if (src.new && !d.querySelector('meta[name="description"]')) fail(file, "no description");
  if (src.new && !d.querySelector('link[rel="canonical"]')) fail(file, "no canonical");
  const h1s = d.querySelectorAll("h1");
  if (h1s.length !== 1) fail(file, `${h1s.length} h1 elements`);
  if (src.title && d.title !== src.title) fail(file, `title changed: "${d.title}"`);
  const desc = d.querySelector('meta[name="description"]')?.getAttribute("content");
  if (src.description && desc !== src.description) fail(file, "description changed");
  const canonical = d.querySelector('link[rel="canonical"]')?.getAttribute("href");
  if (src.canonical && canonical !== src.canonical) fail(file, `canonical changed: ${canonical}`);
  const keepH1 = !["index", "get-a-quote", "thank-you"].includes(src.slug);
  if (keepH1 && src.hero?.h1 && h1s[0] && h1s[0].textContent.trim().replace(/\s+/g, " ") !== src.hero.h1) fail(file, `h1 changed: "${h1s[0].textContent.trim()}" (was "${src.hero.h1}")`);
  if (!html.includes("googletagmanager.com/gtag/js?id=G-3HRP9PCVCH") || !html.includes("gtag('config', 'AW-1374047993')")) fail(file, "analytics tags missing");
  if (html.includes("api.netlify.com")) fail(file, "stray api.netlify.com script");
  if (PPC_PAGES[src.slug] && !/noindex/.test(d.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "")) fail(file, "paid page is indexable");
  if (src.robots && d.querySelector('meta[name="robots"]')?.getAttribute("content") !== src.robots && !PPC_PAGES[src.slug]) fail(file, "robots changed");
  if (src.slug === "thank-you" && (html.match(/gtag\('event', 'conversion'/g) ?? []).length !== 2) fail(file, "conversion tags missing");

  const ids = [...d.querySelectorAll("[id]")].map((e) => e.id);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) fail(file, `duplicate ids: ${[...new Set(dup)].join(", ")}`);
  for (const s of d.querySelectorAll('script[type="application/ld+json"]')) {
    try { JSON.parse(s.textContent); } catch { fail(file, "JSON-LD does not parse"); }
  }
  const refs = [
    ...[...d.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
    ...[...d.querySelectorAll("img[src]")].map((i) => i.getAttribute("src")),
    ...[...d.querySelectorAll("source[srcset]")].flatMap((s) => s.getAttribute("srcset").split(",").map((p) => p.trim().split(" ")[0])),
    ...[...d.querySelectorAll("link[href]")].map((l) => l.getAttribute("href")),
    ...[...d.querySelectorAll("script[src]")].map((s) => s.getAttribute("src")),
  ].filter((h) => h && h.startsWith("/") && !h.startsWith("//"));
  for (const h of new Set(refs)) if (!resolves(h)) fail(file, `broken reference ${h}`);
  for (const a of d.querySelectorAll('a[href^="#"]')) {
    const id = a.getAttribute("href").slice(1);
    if (id && !d.getElementById(id)) fail(file, `in-page link to missing #${id}`);
  }
}

// The print-on-demand calculator (assets/pod-pricing.js, built into site.js)
// against the bases the Studio itself worked out for the price feed's
// examples (content/studio-pricing.json): a rule change the calculator
// doesn't follow fails the build instead of misquoting a creator.
{
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "site-src/assets/pod-pricing.js"), "utf8"), sandbox);
  const feed = JSON.parse(fs.readFileSync(path.join(ROOT, "site-src/content/studio-pricing.json"), "utf8"));
  if (!feed.calculator || !Array.isArray(feed.examples) || !feed.examples.length) fail("studio-pricing.json", "no calculator rules or worked examples");
  else for (const e of feed.examples) {
    const tee = feed.garments.find((g) => g.key === e.garment);
    const got = tee ? sandbox.podPricing.base(feed.calculator, tee, e.method, e.units, e.locations).base : null;
    if (got !== e.base) fail("studio-pricing.json", `calculator base ${got} is not the Studio's ${e.base} (${e.garment}, ${e.method}, ${e.units})`);
  }
  if (!fs.readFileSync(path.join(SITE, "assets/site.js"), "utf8").includes("var podPricing")) fail("assets/site.js", "the pricing engine wasn't built in");
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} problem(s) across ${checked} pages`);
  process.exit(1);
}
console.log(`check: ${checked} pages OK`);

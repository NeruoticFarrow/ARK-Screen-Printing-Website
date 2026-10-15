// Checks the built pages: one H1; every internal link, image, script and
// stylesheet resolves to a file (exact case — Netlify serves case-sensitively);
// no duplicate ids; structured data parses; analytics on every page; the
// paid pages stay noindex; thank-you keeps both conversion tags; and each
// page kept its migrated title, description, canonical and H1.
//
// usage: npm run check   (exit code 1 on any failure)

import fs from "node:fs";
import path from "node:path";
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
const REWRITES = [/^\/shop(\/|$)/, /^\/studio(\/|$)/];

function resolves(href) {
  const clean = decodeURIComponent(href.split("#")[0].split("?")[0]);
  if (!clean || clean === "/") return existsExact("index.html");
  if (REWRITES.some((r) => r.test(clean))) return true; // proxied to the app (_redirects / Netlify)
  const rel = clean.replace(/^\//, "");
  return existsExact(rel) || existsExact(`${rel}.html`);
}

let checked = 0;
for (const f of fs.readdirSync(CONTENT)) {
  const src = JSON.parse(fs.readFileSync(path.join(CONTENT, f), "utf8"));
  if (src.slug === "service-areas-old-backup") continue;
  const html = fs.readFileSync(path.join(SITE, src.file), "utf8");
  const { document: d } = parseHTML(html);
  const file = src.file;
  checked++;

  if (!/name="generator" content="ark-site-src"/.test(html)) fail(file, "not generated");
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

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} problem(s) across ${checked} pages`);
  process.exit(1);
}
console.log(`check: ${checked} pages OK`);

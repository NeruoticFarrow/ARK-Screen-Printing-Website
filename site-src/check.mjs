// Checks the built pages: one H1; every internal link, image, script and
// stylesheet resolves to a file (exact case — Netlify serves case-sensitively);
// no duplicate ids; structured data parses; analytics on every page; the
// paid pages stay noindex; thank-you keeps both conversion tags; and each
// page kept its migrated title, description, canonical and H1.
//
// usage: npm run check   (exit code 1 on any failure)

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseHTML } from "linkedom";
import { PPC_PAGES } from "./content/services.mjs";
import { PPC_LINE, SHOP } from "./lib/facts.mjs";

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
  // Paid pages carry the PPC line and only it; every other page, the shop's.
  const digits = (href) => href.replace(/\D/g, "").slice(-10);
  const [mainLine, ppcLine] = [digits(SHOP.phoneHref), digits(PPC_LINE.phoneHref)];
  const linesShown = [...d.querySelectorAll('a[href^="tel:"], a[href^="sms:"]')].map((a) => digits(a.getAttribute("href")));
  if (PPC_PAGES[src.slug]) {
    if (html.includes(SHOP.phoneDisplay) || linesShown.includes(mainLine)) fail(file, "paid page shows the main number");
    if (!d.querySelector(".header-contact")?.textContent.includes(PPC_LINE.phoneDisplay)) fail(file, "paid page header lacks the PPC number");
  } else if (html.includes(PPC_LINE.phoneDisplay) || linesShown.includes(ppcLine)) {
    fail(file, "the PPC number is on a page that isn't paid search");
  }
  // One look for the header's number everywhere (owner, 2026-10-18).
  if (d.querySelector(".site-header") && src.slug !== "thank-you" && !d.querySelector(".site-header .header-contact")) fail(file, "header phone isn't the pill");
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

// The RMPC client store is not a marketing template and must not inherit
// analytics or quote conversion tracking. It stays unlisted, self-contained,
// and able to talk only to its own checkout function.
const storePath = path.join(SITE, "rmpc.html");
if (!fs.existsSync(storePath)) fail("rmpc.html", "RMPC store page missing");
else {
  const store = fs.readFileSync(storePath, "utf8");
  if (!store.includes('name="robots" content="noindex, nofollow"')) fail("rmpc.html", "must stay noindex");
  if (!store.includes('rel="canonical" href="https://arkscreenprinting.com/rmpc"')) fail("rmpc.html", "wrong canonical slug");
  if ((store.match(/data:image\/webp;base64,/g) ?? []).length < 7) fail("rmpc.html", "product images are not embedded");
  if (!store.includes("data:image/png;base64,")) fail("rmpc.html", "the RMPC crown is not embedded");
  if ((store.match(/data:font\/ttf;base64,/g) ?? []).length < 8) fail("rmpc.html", "fonts are not embedded");
  if (/googletagmanager\.com|gtag\(|fbq\(/.test(store)) fail("rmpc.html", "the store must not load analytics or send conversions");
  if (!store.includes('"/api/rmpc/checkout"')) fail("rmpc.html", "the bag does not post to /api/rmpc/checkout");
  if (/(src|href)="(https?:)?\/\//.test(store.replace(/<link rel="canonical"[^>]*>/, ""))) fail("rmpc.html", "loads something from another origin");
  const headers = fs.readFileSync(path.join(SITE, "_headers"), "utf8");
  for (const route of ["/rmpc", "/rmpc.html"]) {
    const block = headers.split("\n").slice(headers.split("\n").indexOf(route) + 1).filter((line, i, lines) => !lines.slice(0, i + 1).some((s) => s && !s.startsWith("  "))).join("\n");
    // Framing: only named https sites, never every site (*) or every https one.
    const framers = block.match(/frame-ancestors ([^;\n]+)/)?.[1].trim().split(/\s+/) ?? [];
    const framersNamed = framers.length > 0 && framers.every((src) => src === "'self'" || src === "'none'" || /^https:\/\/(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(src));
    if (!headers.split("\n").includes(route) || !block.includes("X-Robots-Tag: noindex, nofollow") || !block.includes("connect-src 'self';") || !block.includes("form-action 'none'") || !framersNamed) fail("rmpc.html", `unsafe store headers for ${route}`);
  }
  for (const fn of ["rmpc-checkout.mjs", "rmpc-orders.mjs", "stripe-webhook.mjs"]) {
    if (!fs.existsSync(path.join(ROOT, "netlify/functions", fn))) fail("rmpc.html", `netlify/functions/${fn} missing`);
  }
}

// The Best of the Springs sample store: unlisted and self-contained like the
// RMPC store, and with no checkout yet it may talk to nothing at all.
const botsPath = path.join(SITE, "bos.html");
if (!fs.existsSync(botsPath)) fail("bos.html", "Best of the Springs store page missing");
else {
  const store = fs.readFileSync(botsPath, "utf8");
  const file = "bos.html";
  if (!store.includes('name="robots" content="noindex, nofollow"')) fail(file, "must stay noindex");
  if (!store.includes('rel="canonical" href="https://arkscreenprinting.com/bos"')) fail(file, "wrong canonical slug");
  if ((store.match(/data:image\/webp;base64,/g) ?? []).length < 16) fail(file, "garment templates or artwork are not embedded");
  if ((store.match(/data:font\/woff2;base64,/g) ?? []).length < 7) fail(file, "fonts are not embedded");
  if (/googletagmanager\.com|gtag\(|fbq\(/.test(store)) fail(file, "the store must not load analytics or send conversions");
  if (/(src|href)="(https?:)?\/\//.test(store.replace(/<link rel="canonical"[^>]*>/, ""))) fail(file, "loads something from another origin");
  const headers = fs.readFileSync(path.join(SITE, "_headers"), "utf8");
  for (const route of ["/bos", "/bos.html"]) {
    const lines = headers.split("\n");
    const at = lines.indexOf(route);
    const end = lines.findIndex((line, i) => i > at && line && !line.startsWith("  "));
    const block = at < 0 ? "" : lines.slice(at + 1, end < 0 ? undefined : end).join("\n");
    if (at < 0 || !block.includes("X-Robots-Tag: noindex, nofollow") || !block.includes("connect-src 'none';") || !block.includes("form-action 'none'") || !/frame-ancestors 'self'$/m.test(block)) fail(file, `unsafe store headers for ${route}`);
  }
  if (!/^\/bos\s+\/bos\.html\s+200$/m.test(fs.readFileSync(path.join(SITE, "_redirects"), "utf8"))) fail(file, "_redirects must serve the store at /bos");
}

// The client store dashboard shows buyers' names and emails: unlisted, never
// framed, no analytics, nothing from another origin, no referrer, and only its
// own inline bundle may run (the CSP names its hashes, not 'unsafe-inline').
const dashboardPath = path.join(SITE, "dashboard.html");
if (!fs.existsSync(dashboardPath)) fail("dashboard.html", "client dashboard page missing");
else {
  const page = fs.readFileSync(dashboardPath, "utf8");
  const file = "dashboard.html";
  if (!page.includes('name="robots" content="noindex, nofollow"')) fail(file, "must stay noindex");
  if (!page.includes('name="referrer" content="no-referrer"')) fail(file, "must send no referrer");
  if (!page.includes('rel="canonical" href="https://arkscreenprinting.com/dashboard"')) fail(file, "wrong canonical slug");
  if (/googletagmanager\.com|gtag\(|fbq\(/.test(page)) fail(file, "the dashboard must not load analytics");
  if (/(src|href)="(https?:)?\/\//.test(page.replace(/<link rel="canonical"[^>]*>/, ""))) fail(file, "loads something from another origin");
  if (!page.includes('"/api/dashboard"')) fail(file, "the page does not talk to /api/dashboard");
  for (const ref of ["/assets/brand/ark-logo-120.png", "/fonts/gf/inter-400.woff2", "/fonts/gf/fraunces-latin.woff2"]) {
    if (page.includes(ref) && !existsExact(ref.slice(1))) fail(file, `broken reference ${ref}`);
  }
  const inline = (tag) => page.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "";
  const hash = (text) => `'sha256-${crypto.createHash("sha256").update(text, "utf8").digest("base64")}'`;
  const lines = fs.readFileSync(path.join(SITE, "_headers"), "utf8").split("\n");
  for (const route of ["/dashboard", "/dashboard/*", "/dashboard.html"]) {
    const at = lines.indexOf(route);
    const end = lines.findIndex((line, i) => i > at && line && !line.startsWith("  "));
    const block = at < 0 ? "" : lines.slice(at + 1, end < 0 ? undefined : end).join("\n");
    const csp = block.match(/Content-Security-Policy: (.+)/)?.[1] ?? "";
    const safe = at >= 0 && block.includes("X-Robots-Tag: noindex, nofollow") && block.includes("Referrer-Policy: no-referrer")
      && csp.includes(`script-src ${hash(inline("script"))};`) && csp.includes(`style-src ${hash(inline("style"))};`)
      && csp.includes("connect-src 'self';") && /frame-ancestors 'none'$/.test(csp) && !csp.includes("unsafe");
    if (!safe) fail(file, `unsafe or stale headers for ${route} (rebuild with npm run build)`);
  }
  const redirects = fs.readFileSync(path.join(SITE, "_redirects"), "utf8");
  if (!/^\/dashboard\s+\/dashboard\.html\s+200$/m.test(redirects) || !/^\/dashboard\/\*\s+\/dashboard\.html\s+200$/m.test(redirects)) fail(file, "_redirects must serve the dashboard at /dashboard and below");
  if (!fs.existsSync(path.join(ROOT, "netlify/functions/dashboard-api.mjs"))) fail(file, "netlify/functions/dashboard-api.mjs missing");
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} problem(s) across ${checked} pages`);
  process.exit(1);
}
console.log(`check: ${checked} pages OK`);

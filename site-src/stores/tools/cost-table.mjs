// ARK's price behind each product in a store, by order quantity, for Alex
// only (it never goes on the public page).
//
//   node site-src/stores/tools/cost-table.mjs <ark-designer repo> <store folder> [out folder]
//
// Prices come from the quote form's rules as ark-designer carries them
// (shared/creatorPricing.ts, PRICE_RULES_V2): garment = blank × 2 (or the
// form's fixed price), digital = DTF film at the gang-sheet rate + $2 press a
// location + $3 each extra location, screen = impressions + (screens × $35 +
// $23 admin) ÷ run + $3 each extra location; the table prices screen print
// off cost instead (GARMENT_MARKUP below). Colors per print come from the
// designer's own detection (client/src/lib/colourDetection.ts) on the print as
// it sits on the product's default colour. A print the detection reads as
// full color can carry `spotColours` in the catalog: the count if the art is
// redrawn in flat spot colors, used for screen print and marked "redrawn".
//
// Tiers follow ARK's methods (Alex, 2026-11-28): 1–23 is digital; from 24
// pieces the table uses screen print
// wherever the rules allow it (3 colors a location from 24, 6 from 40), even
// where digital would be cheaper (Alex, 2026-11-28); full-color art stays
// digital. ARK margin is
// ARK's price less its costs: the blank's landed cost (wholesale + $0.25 for
// ink, emulsion and the like), plus the gang-sheet film's raw cost for
// digital, or press labor per impression (SCREEN_LABOR) for screen print.
// Screen print is the landed blank × 2, labor at cost and the set-up charge.
// Digital press time isn't costed yet.
//
// Every product is priced on both garment tiers in ../tiers.mjs: Premium
// (AS Colour, what the sample shows) and Standard (mid-range, lower retail).
// Quantity tiers are Alex's (2026-11-28): 1–23, 24–49, 50–100, each priced at
// both ends and shown at its top end.
//
// Prints the Markdown table (for the store's README and the PR). With an out
// folder it also writes pricing.csv and pricing.pdf (internal, with ARK's
// margin) and client-pricing.csv and client-pricing.pdf (no margin or blank
// cost: the copy the prospect reply attaches) there. Needs Playwright's
// Chromium (not a dependency of this repo: run where it's installed).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import * as esbuild from "esbuild";
import { TIERS } from "../tiers.mjs";

const [designer, storeDir, outDir] = process.argv.slice(2).map((p) => path.resolve(p));
if (!designer || !storeDir) {
  console.error("usage: node cost-table.mjs <ark-designer repo> <store folder> [out folder]");
  process.exit(1);
}
// Screen-print labor per impression (one squeegee pull: one color on one
// garment), Alex's shop model (2026-11-28): 100 impressions an hour on press,
// 30% of the hour actually on press (the rest is set-up and everything else),
// $25 an hour. That's 30 impressions per paid hour, about $0.83 each. Set-up
// time sits inside the other 70%, so screens and admin carry no extra cost.
export const SCREEN_LABOR = { impressionsPerHour: 100, utilization: 0.3, hourlyRate: 25 };
const IMPRESSION_LABOR = SCREEN_LABOR.hourlyRate / (SCREEN_LABOR.impressionsPerHour * SCREEN_LABOR.utilization);
// Added to each blank's wholesale cost for its landed cost: ink, emulsion and
// the like, on every garment whichever way it prints (Alex, 2026-11-28: 25¢ on
// wholesale, so 50¢ once the garment's 100% markup is on).
const LANDED_EXTRA = 0.25;
// Screen print is priced off cost (Alex, 2026-11-28): the landed blank marked
// up 100%, plus each impression at its labor cost (SCREEN_LABOR, no markup),
// plus the quote form's set-up charge (screens × $35 + $23 admin) spread over
// the run. The form's impression rates and extra-location fee don't apply.
// Digital stays at the quote form's price.
export const GARMENT_MARKUP = 1;

export const QTY_TIERS = [
  { label: "1–23", from: 1, to: 23 },
  { label: "24–49", from: 24, to: 49 },
  { label: "50–100", from: 50, to: 100 },
];

const { chromium } = createRequire(import.meta.url)("playwright");
const { STORE, PRODUCTS, GARMENTS, unitPriceCents, colourOf, garmentLook } = await import(path.join(storeDir, "catalog.mjs"));

/** The blank's wholesale cost, from the designer's generated catalogue. */
const productsTs = fs.readFileSync(path.join(designer, "client/src/lib/products.ts"), "utf8");
function blankCost(style) {
  const m = productsTs.match(new RegExp(`"id":\\s*"${style}"[\\s\\S]*?"cost":\\s*([0-9.]+)`));
  if (!m) throw new Error(`no cost for ${style} in products.ts`);
  return Number(m[1]);
}

// The designer's detection and the quote form's rules, bundled for the
// browser (detection needs a canvas).
const bundle = await esbuild.build({
  stdin: {
    contents: `import { analyzeRasterImage } from "@/lib/colourDetection";
import * as P from "@shared/creatorPricing";
window.ARK = { analyzeRasterImage, P };`,
    resolveDir: path.join(designer, "client/src"),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  alias: { "@": path.join(designer, "client/src"), "@shared": path.join(designer, "shared") },
  logLevel: "error",
});
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");
await page.addScriptTag({ content: bundle.outputFiles[0].text });

const inches = (s) => (s.match(/([0-9.]+)″\s*×\s*([0-9.]+)″/) ?? []).slice(1).map(Number);
const money = (n) => `$${n.toFixed(2)}`;

const rows = [];
for (const p of PRODUCTS) {
  const garment = GARMENTS[p.garment];
  const colour = colourOf(p, p.colour);
  const locations = [];
  for (const side of Object.keys(p.prints)) {
    const print = p.prints[side];
    const art = garmentLook(p, p.colour, side).prints[0].art;
    const src = `data:image/webp;base64,${fs.readFileSync(path.join(storeDir, "images/art", `${art}.webp`)).toString("base64")}`;
    const found = await page.evaluate(async ([url, hex]) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const r = window.ARK.analyzeRasterImage(img, hex);
      return { count: r.count, isSimulated: r.isSimulated };
    }, [src, colour.hex]);
    const [widthIn, heightIn] = inches(print.size);
    const redrawn = found.isSimulated && print.spotColours != null;
    locations.push({ widthIn, heightIn, colours: redrawn ? print.spotColours : found.count, simulated: found.isSimulated && !redrawn, redrawn });
  }
  const tier = TIERS[garment.kind];
  if (!tier) throw new Error(`no garment tiers for ${garment.kind} in tiers.mjs`);
  const ends = { premium: { ...tier.premium, retail: unitPriceCents(p, garment.sizes[0]) / 100 }, standard: { ...tier.standard, retail: tier.standard.retailCents / 100 } };
  const priced = {};
  for (const [name, blank] of Object.entries(ends)) {
    const cost = blankCost(blank.style);
    const tiers = await page.evaluate(([locs, cost, key, tiers, labor, extra, markup]) => {
      const { P } = window.ARK;
      const R = P.PRICE_RULES_V2;
      const L = locs.map(({ widthIn, heightIn, colours }) => ({ widthIn, heightIn, colours }));
      const film = L.reduce((s, l) => s + P.dtfTransferCost(R, l), 0) / R.dtf.materialMarkupMultiplier;
      const simulated = locs.some((l) => l.simulated);
      const at = (qty) => {
        const dtf = P.dtfBase(R, cost, L, undefined, key);
        // Alex's limit (2026-11-28) on top of the quote form's: total colors
        // across all locations, at most 3 up to 40 pieces, 4 for 41-49, 6 a
        // location from 50.
        const total = L.reduce((n, l) => n + l.colours, 0);
        const alexOk = qty >= 50 || total <= (qty <= 40 ? 3 : 4);
        const screenOk = P.screenEligibility(R, qty, L, simulated) === null && alexOk;
        const screens = L.reduce((n, l) => n + Math.min(Math.max(1, l.colours), R.screen.maxColours), 0);
        const screenCost = cost + extra + screens * labor;
        const formula = screenOk ? P.screenBase(R, cost, qty, L, undefined, key) : null;
        const setUp = (R.screen.screenFeePerScreen * screens + R.screen.adminFeePerRun) / qty;
        const screen = formula === null ? null : (cost + extra) * (1 + markup) + screens * labor + setUp;
        const useScreen = screen !== null;
        const price = useScreen ? screen : dtf;
        const hard = useScreen ? screenCost : cost + extra + film;
        return { qty, method: useScreen ? "screen_print" : "dtf", price, dtf, screen, formula, hard, margin: price - hard };
      };
      return tiers.map((t) => ({ ...t, low: at(t.from), high: at(t.to) }));
    }, [locations, cost, blank.key ?? null, QTY_TIERS, IMPRESSION_LABOR, LANDED_EXTRA, GARMENT_MARKUP]);
    priced[name] = { label: blank.label, style: blank.style, cost, retail: blank.retail, tiers };
  }
  const inks = locations.map((l) => (l.simulated ? "full color" : `${l.colours}${l.redrawn ? " (redrawn)" : ""}`)).join(" + ");
  rows.push({ product: p.name, inks, ...priced });
}
await browser.close();

const METHOD = { dtf: "digital", screen_print: "screen" };
const method = (t) => METHOD[t.high.method];
// One flat number per tier (Alex, 2026-11-28): the price at its top end
// (23, 49, 100 pieces).
const avg = (t, k) => t.high[k];
const price = (t) => money(avg(t, "price"));
const margin = (t) => `${money(avg(t, "margin"))} (${Math.round((avg(t, "margin") / avg(t, "price")) * 100)}%)`;
const keeps = (g, t) => money(g.retail - avg(t, "price"));
const blank = (g) => `${g.label}, ${money(g.cost)}`;

// Markdown, one row per product and quantity tier, Premium then Standard.
const md = [
  "| Product | Ink colors | Qty | Premium: method | ARK price | ARK margin | Org keeps | Standard: method | ARK price | ARK margin | Org keeps |",
  "|---|---|---|---|---|---|---|---|---|---|---|",
];
for (const r of rows) {
  r.premium.tiers.forEach((t, i) => {
    const s = r.standard.tiers[i];
    const name = i === 0 ? `${r.product}<br>Premium ${blank(r.premium)}, retail ${money(r.premium.retail)}<br>Standard ${blank(r.standard)}, retail ${money(r.standard.retail)}` : "";
    md.push(`| ${name} | ${r.inks} | ${t.label} | ${method(t)} | ${price(t)} | ${margin(t)} | ${keeps(r.premium, t)} | ${method(s)} | ${price(s)} | ${margin(s)} | ${keeps(r.standard, s)} |`);
  });
}
console.log(md.join("\n"));

if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const csv = [["product", "garment_tier", "blank", "blank_style", "blank_wholesale", "ink_colors", "qty_tier", "method", "ark_price_per_item", "ark_margin_per_item", "retail", "org_keeps_per_item", "price_at_tier_low", "price_at_tier_high", "digital_price", "screen_price_at_tier_low", "screen_price_at_tier_high"]];
  const c = (n) => (n == null ? "" : n.toFixed(2));
  for (const r of rows) {
    for (const tierName of ["premium", "standard"]) {
      const g = r[tierName];
      for (const t of g.tiers) {
        csv.push([r.product, tierName, g.label, g.style, c(g.cost), r.inks, t.label, method(t), c(avg(t, "price")), c(avg(t, "margin")), c(g.retail), c(g.retail - avg(t, "price")), c(t.low.price), c(t.high.price), c(t.low.dtf), c(t.low.screen), c(t.high.screen)]);
      }
    }
  }
  fs.writeFileSync(path.join(outDir, "pricing.csv"), csv.map((row) => row.map(csvCell).join(",")).join("\n") + "\n");

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = rows
    .map((r) => `<tr class="head"><th colspan="9">${esc(r.product)} <span>${esc(r.inks)} ink colors</span></th></tr>` +
      `<tr class="sub"><td></td><td colspan="4">Premium · ${esc(blank(r.premium))} · retail ${money(r.premium.retail)}</td><td colspan="4">Standard · ${esc(blank(r.standard))} · retail ${money(r.standard.retail)}</td></tr>` +
      r.premium.tiers.map((t, i) => {
        const s = r.standard.tiers[i];
        return `<tr><td>${t.label}</td><td>${method(t)}</td><td>${price(t)}</td><td>${margin(t)}</td><td>${keeps(r.premium, t)}</td><td class="std">${method(s)}</td><td>${price(s)}</td><td>${margin(s)}</td><td>${keeps(r.standard, s)}</td></tr>`;
      }).join(""))
    .join("");
  const html = `<!doctype html><meta charset="utf-8"><style>
body{font:10.5px/1.4 -apple-system,Helvetica,Arial,sans-serif;color:#1f2a2c;margin:24px}
h1{font-size:18px;margin:0 0 4px}p{margin:0 0 14px;color:#5c6a6b}
table{border-collapse:collapse;width:100%}th,td{padding:4px 7px;border-bottom:1px solid #dbe2df;text-align:left}
tr.head th{background:#e2f1f0;font-size:12px;padding-top:9px}tr.head span{font-weight:400;color:#5c6a6b;margin-left:8px}
tr.sub td{color:#5c6a6b;font-size:10px}td.std{border-left:2px solid #dbe2df}
thead th{font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:#5c6a6b}
</style><h1>${esc(STORE.client ?? STORE.name)} · pricing by quantity and garment tier</h1>
<p>Internal, for ARK only: not for the client. Premium is the AS Colour blank the sample store shows; Standard is ARK's mid-range blank at a lower suggested retail. ARK's price uses the quote form's rules (gang-sheet digital, screen print from 24) prices 1–23 as digital and uses screen print from 24 pieces wherever it's allowed; each quantity tier shows the price at its largest order (23, 49, 100). ARK margin is that price less the blank's landed cost (wholesale + $0.25 for ink, emulsion and the like) plus, for digital, the film's raw gang-sheet cost, or for screen print, press labor at about $0.83 an impression (100 an hour, 30% on press, $25 an hour). Screen print is priced off cost: the landed blank marked up 100%, plus labor at cost ($0.83 an impression), plus the set-up charge ($35 a screen + $23 admin) spread over the run. Digital press time isn't costed yet. Generated ${new Date().toISOString().slice(0, 10)}.</p>
<table><thead><tr><th>Qty</th><th>Premium: method</th><th>ARK price</th><th>ARK margin</th><th>Org keeps</th><th>Standard: method</th><th>ARK price</th><th>ARK margin</th><th>Org keeps</th></tr></thead><tbody>${body}</tbody></table>`;
  // The client's copy: no ARK margin or blank cost (Alex, 2026-11-28: the
  // margin is for ARK only). This is the table the prospect reply attaches.
  const clientCsv = [["product", "garment", "quantity", "our_price_per_item", "suggested_retail", "you_keep_per_item"]];
  for (const r of rows) {
    for (const tierName of ["premium", "standard"]) {
      const g = r[tierName];
      for (const t of g.tiers) clientCsv.push([r.product, `${tierName === "premium" ? "Premium" : "Standard"} (${g.label})`, t.label, c(avg(t, "price")), c(g.retail), c(g.retail - avg(t, "price"))]);
    }
  }
  fs.writeFileSync(path.join(outDir, "client-pricing.csv"), clientCsv.map((row) => row.map(csvCell).join(",")).join("\n") + "\n");
  const clientBody = rows
    .map((r) => `<tr class="head"><th colspan="7">${esc(r.product)}</th></tr>` +
      `<tr class="sub"><td></td><td colspan="3">Premium · ${esc(r.premium.label)} · suggested ${money(r.premium.retail)}</td><td colspan="3">Standard · ${esc(r.standard.label)} · suggested ${money(r.standard.retail)}</td></tr>` +
      r.premium.tiers.map((t, i) => {
        const s = r.standard.tiers[i];
        return `<tr><td>${t.label}</td><td>${price(t)}</td><td>${money(r.premium.retail)}</td><td>${keeps(r.premium, t)}</td><td class="std">${price(s)}</td><td>${money(r.standard.retail)}</td><td>${keeps(r.standard, s)}</td></tr>`;
      }).join(""))
    .join("");
  const clientHtml = html.replace(/<h1>[\s\S]*$/, "") + `<h1>${esc(STORE.client ?? STORE.name)} · pricing</h1>
<p>Our price per item by order quantity, for the designs in your sample store. You set the retail price and keep the difference. Premium is the AS Colour garment shown in the store; Standard is a lower-cost garment at a lower suggested price. Prices are before sales tax and shipping, which supporters pay at checkout.</p>
<table><thead><tr><th>Qty</th><th>Premium: our price</th><th>Suggested retail</th><th>You keep</th><th>Standard: our price</th><th>Suggested retail</th><th>You keep</th></tr></thead><tbody>${clientBody}</tbody></table>`;
  const pdfBrowser = await chromium.launch();
  const pdfPage = await pdfBrowser.newPage();
  await pdfPage.setContent(html);
  await pdfPage.pdf({ path: path.join(outDir, "pricing.pdf"), format: "Letter", landscape: true, margin: { top: "0.4in", bottom: "0.4in", left: "0.4in", right: "0.4in" } });
  await pdfPage.setContent(clientHtml);
  await pdfPage.pdf({ path: path.join(outDir, "client-pricing.pdf"), format: "Letter", landscape: true, margin: { top: "0.4in", bottom: "0.4in", left: "0.4in", right: "0.4in" } });
  await pdfBrowser.close();
}

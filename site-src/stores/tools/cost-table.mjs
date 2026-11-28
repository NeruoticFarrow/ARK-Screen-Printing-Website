// ARK's price behind each product in a store, by order quantity, for Alex
// only (it never goes on the public page). It runs ark-designer's own colour
// detection (client/src/lib/colourDetection.ts) on each print as it sits on
// the product's default colour, then ark-designer's quote math
// (client/src/lib/pricing.ts, calcPrice) with the blank's wholesale cost from
// ark-designer's catalogue (client/src/lib/products.ts), so the numbers match
// what the designer and quote form would give.
//
//   node site-src/stores/tools/cost-table.mjs <ark-designer repo> <store folder> [out folder]
//
// Prints the Markdown table (for the store's README and the PR). With an out
// folder it also writes pricing.csv and pricing.pdf there. Needs Playwright's
// Chromium (not a dependency of this repo: run where it's installed).
//
// Every product is priced on both garment tiers in ../tiers.mjs: Premium
// (AS Colour, what the sample shows) and Standard (mid-range, lower retail).
//
// Quantity tiers are Alex's (2026-11-28): 1–24, 25–49, 50–100. Each is priced
// at both ends; the quote rules change at 24 pieces (screen print allowed) and
// 40 (more than 2 colours a location allowed), so a tier's low end is the
// conservative number.
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
export const QTY_TIERS = [
  { label: "1–24", from: 1, to: 24 },
  { label: "25–49", from: 25, to: 49 },
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

// The designer's detection and pricing, bundled for the browser (detection
// needs a canvas).
const bundle = await esbuild.build({
  stdin: {
    contents: `import { analyzeRasterImage } from "@/lib/colourDetection";
import { calcPrice } from "@/lib/pricing";
window.ARK = { analyzeRasterImage, calcPrice };`,
    resolveDir: path.join(designer, "client/src"),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  alias: { "@": path.join(designer, "client/src") },
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
    locations.push({ id: side, label: print.place, widthIn, heightIn, colors: found.count, simulated: found.isSimulated });
  }
  const tier = TIERS[garment.kind];
  if (!tier) throw new Error(`no garment tiers for ${garment.kind} in tiers.mjs`);
  const ends = { premium: { ...tier.premium, retail: unitPriceCents(p, garment.sizes[0]) / 100 }, standard: { ...tier.standard, retail: tier.standard.retailCents / 100 } };
  const priced = {};
  for (const [name, blank] of Object.entries(ends)) {
    const cost = blankCost(blank.style);
    const input = { garmentWholesale: cost, locations, isSimulatedProcess: locations.some((l) => l.simulated) };
    // calcPrice picks screen print where the quote rules allow it, else digital.
    const tiers = await page.evaluate(([base, tiers]) => tiers.map((t) => {
      const at = (qty) => {
        const r = window.ARK.calcPrice({ ...base, qty });
        return { qty, method: r.method, price: r.perUnitCost };
      };
      return { ...t, low: at(t.from), high: at(t.to) };
    }), [input, QTY_TIERS]);
    priced[name] = { label: blank.label, style: blank.style, cost, retail: blank.retail, tiers };
  }
  rows.push({ product: p.name, inks: locations.map((l) => `${l.colors}${l.simulated ? " (full color)" : ""}`).join(" + "), ...priced });
}
await browser.close();

const METHOD = { heat_transfer: "digital", screen_print: "screen" };
const span = (a, b, f) => (Math.abs(a - b) < 0.005 ? f(a) : `${f(a)}–${f(b)}`);
const method = (t) => (t.low.method === t.high.method ? METHOD[t.low.method] : `${METHOD[t.low.method]}→${METHOD[t.high.method]}`);
const keeps = (g, t) => span(g.retail - t.low.price, g.retail - t.high.price, money);
const keepsTier = (g, t) => `${money((g.retail - t.low.price) * t.from)}–${money((g.retail - t.high.price) * t.to)}`;
const blank = (g) => `${g.label}, ${money(g.cost)}`;

// Markdown, one row per product and quantity tier, Premium then Standard.
const md = [
  "| Product | Ink colors | Qty | Method | Premium: ARK price | Premium: org keeps per item | Premium: org keeps, whole tier | Standard: ARK price | Standard: org keeps per item | Standard: org keeps, whole tier |",
  "|---|---|---|---|---|---|---|---|---|---|",
];
for (const r of rows) {
  r.premium.tiers.forEach((t, i) => {
    const s = r.standard.tiers[i];
    const name = i === 0 ? `${r.product}<br>Premium ${blank(r.premium)}, retail ${money(r.premium.retail)}<br>Standard ${blank(r.standard)}, retail ${money(r.standard.retail)}` : "";
    md.push(`| ${name} | ${r.inks} | ${t.label} | ${method(t)} | ${span(t.low.price, t.high.price, money)} | ${keeps(r.premium, t)} | ${keepsTier(r.premium, t)} | ${span(s.low.price, s.high.price, money)} | ${keeps(r.standard, s)} | ${keepsTier(r.standard, s)} |`);
  });
}
console.log(md.join("\n"));

if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const csv = [["product", "garment_tier", "blank", "blank_style", "blank_wholesale", "ink_colors", "qty_tier", "qty", "method", "ark_price_per_item", "retail", "org_keeps_per_item", "org_keeps_total"]];
  for (const r of rows) {
    for (const tierName of ["premium", "standard"]) {
      const g = r[tierName];
      for (const t of g.tiers) {
        for (const end of [t.low, t.high]) {
          csv.push([r.product, tierName, g.label, g.style, g.cost.toFixed(2), r.inks, t.label, end.qty, METHOD[end.method], end.price.toFixed(2), g.retail.toFixed(2), (g.retail - end.price).toFixed(2), ((g.retail - end.price) * end.qty).toFixed(2)]);
        }
      }
    }
  }
  fs.writeFileSync(path.join(outDir, "pricing.csv"), csv.map((row) => row.map(csvCell).join(",")).join("\n") + "\n");

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = rows
    .map((r) => `<tr class="head"><th colspan="8">${esc(r.product)} <span>${esc(r.inks)} ink colors</span></th></tr>` +
      `<tr class="sub"><td></td><td></td><td colspan="3">Premium · ${esc(blank(r.premium))} · retail ${money(r.premium.retail)}</td><td colspan="3">Standard · ${esc(blank(r.standard))} · retail ${money(r.standard.retail)}</td></tr>` +
      r.premium.tiers.map((t, i) => {
        const s = r.standard.tiers[i];
        return `<tr><td>${t.label}</td><td>${method(t)}</td><td>${span(t.low.price, t.high.price, money)}</td><td>${keeps(r.premium, t)}</td><td>${keepsTier(r.premium, t)}</td><td class="std">${span(s.low.price, s.high.price, money)}</td><td>${keeps(r.standard, s)}</td><td>${keepsTier(r.standard, s)}</td></tr>`;
      }).join(""))
    .join("");
  const html = `<!doctype html><meta charset="utf-8"><style>
@page{size:Letter landscape}
body{font:10.5px/1.4 -apple-system,Helvetica,Arial,sans-serif;color:#1f2a2c;margin:24px}
h1{font-size:18px;margin:0 0 4px}p{margin:0 0 14px;color:#5c6a6b}
table{border-collapse:collapse;width:100%}th,td{padding:4px 7px;border-bottom:1px solid #dbe2df;text-align:left}
tr.head th{background:#e2f1f0;font-size:12px;padding-top:9px}tr.head span{font-weight:400;color:#5c6a6b;margin-left:8px}
tr.sub td{color:#5c6a6b;font-size:10px}td.std{border-left:2px solid #dbe2df}
thead th{font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:#5c6a6b}
</style><h1>${esc(STORE.client ?? STORE.name)} · pricing by quantity and garment tier</h1>
<p>Internal, for ARK. Premium is the AS Colour blank the sample store shows; Standard is ARK's mid-range blank at a lower suggested retail. ARK's price per item comes from ark-designer's quote rules and color detection; each quantity tier is priced at its smallest and largest order. Generated ${new Date().toISOString().slice(0, 10)}.</p>
<table><thead><tr><th>Qty</th><th>Method</th><th>Premium: ARK price</th><th>Org keeps per item</th><th>Org keeps, whole tier</th><th>Standard: ARK price</th><th>Org keeps per item</th><th>Org keeps, whole tier</th></tr></thead><tbody>${body}</tbody></table>`;
  const pdfBrowser = await chromium.launch();
  const pdfPage = await pdfBrowser.newPage();
  await pdfPage.setContent(html);
  await pdfPage.pdf({ path: path.join(outDir, "pricing.pdf"), format: "Letter", landscape: true, margin: { top: "0.4in", bottom: "0.4in", left: "0.4in", right: "0.4in" } });
  await pdfBrowser.close();
}

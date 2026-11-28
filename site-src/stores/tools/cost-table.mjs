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
// Quantity tiers are Alex's (2026-11-28): 1–24, 25–49, 50–100. Each is priced
// at both ends; the quote rules change at 24 pieces (screen print allowed) and
// 40 (more than 2 colours a location allowed), so a tier's low end is the
// conservative number.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import * as esbuild from "esbuild";

const [designer, storeDir, outDir] = process.argv.slice(2).map((p) => path.resolve(p));
if (!designer || !storeDir) {
  console.error("usage: node cost-table.mjs <ark-designer repo> <store folder> [out folder]");
  process.exit(1);
}
export const TIERS = [
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
  const cost = blankCost(garment.style);
  const input = { garmentWholesale: cost, locations, isSimulatedProcess: locations.some((l) => l.simulated) };
  const retail = unitPriceCents(p, garment.sizes[0]) / 100;
  // calcPrice picks screen print where the quote rules allow it, else digital.
  const tiers = await page.evaluate(([base, tiers]) => tiers.map((t) => {
    const at = (qty) => {
      const r = window.ARK.calcPrice({ ...base, qty });
      return { qty, method: r.method, price: r.perUnitCost, blankPrice: r.garmentRetail, print: r.decorationPerUnit, transfer: r.transferCharge ?? 0 };
    };
    return { ...t, low: at(t.from), high: at(t.to) };
  }), [input, TIERS]);
  rows.push({ product: p.name, style: garment.style, cost, inks: locations.map((l) => `${l.colors}${l.simulated ? " (full color)" : ""}`).join(" + "), retail, tiers });
}
await browser.close();

const METHOD = { heat_transfer: "digital", screen_print: "screen" };
const span = (a, b, f) => (Math.abs(a - b) < 0.005 ? f(a) : `${f(a)}–${f(b)}`);
const method = (t) => (t.low.method === t.high.method ? METHOD[t.low.method] : `${METHOD[t.low.method]}→${METHOD[t.high.method]}`);

// Markdown, one row per product and tier.
const md = [
  "| Product | Blank, wholesale | Ink colors | Qty | Method | ARK price per item | Retail | Org keeps per item | Org keeps, whole tier |",
  "|---|---|---|---|---|---|---|---|---|",
];
for (const r of rows) {
  for (const t of r.tiers) {
    md.push(
      `| ${r.product} | ${r.style}, ${money(r.cost)} | ${r.inks} | ${t.label} | ${method(t)} | ${span(t.low.price, t.high.price, money)} | ${money(r.retail)} | ${span(r.retail - t.low.price, r.retail - t.high.price, money)} | ${money((r.retail - t.low.price) * t.from)}–${money((r.retail - t.high.price) * t.to)} |`,
    );
  }
}
console.log(md.join("\n"));

if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const csv = [["product", "blank_style", "blank_wholesale", "ink_colors", "tier", "qty", "method", "ark_price_per_item", "retail", "org_keeps_per_item", "org_keeps_total"]];
  for (const r of rows) {
    for (const t of r.tiers) {
      for (const end of [t.low, t.high]) {
        csv.push([r.product, r.style, r.cost.toFixed(2), r.inks, t.label, end.qty, METHOD[end.method], end.price.toFixed(2), r.retail.toFixed(2), (r.retail - end.price).toFixed(2), ((r.retail - end.price) * end.qty).toFixed(2)]);
      }
    }
  }
  fs.writeFileSync(path.join(outDir, "pricing.csv"), csv.map((row) => row.map(csvCell).join(",")).join("\n") + "\n");

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = rows
    .map((r) => `<tr class="head"><th colspan="5">${esc(r.product)} <span>${esc(r.style)} blank ${money(r.cost)} · ${esc(r.inks)} ink colors · retail ${money(r.retail)}</span></th></tr>` +
      r.tiers.map((t) => `<tr><td>${t.label}</td><td>${method(t)}</td><td>${span(t.low.price, t.high.price, money)}</td><td>${span(r.retail - t.low.price, r.retail - t.high.price, money)}</td><td>${money((r.retail - t.low.price) * t.from)}–${money((r.retail - t.high.price) * t.to)}</td></tr>`).join(""))
    .join("");
  const html = `<!doctype html><meta charset="utf-8"><style>
body{font:11px/1.4 -apple-system,Helvetica,Arial,sans-serif;color:#1f2a2c;margin:28px}
h1{font-size:18px;margin:0 0 4px}p{margin:0 0 14px;color:#5c6a6b}
table{border-collapse:collapse;width:100%}th,td{padding:5px 8px;border-bottom:1px solid #dbe2df;text-align:left}
tr.head th{background:#e2f1f0;font-size:12px;padding-top:9px}tr.head span{font-weight:400;color:#5c6a6b;margin-left:8px}
thead th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#5c6a6b}
</style><h1>${esc(STORE.client ?? STORE.name)} · pricing by quantity</h1>
<p>Internal, for ARK. ARK's price per item comes from ark-designer's quote rules and color detection; each tier is priced at its smallest and largest order. Retail is the store's sample price. Generated ${new Date().toISOString().slice(0, 10)}.</p>
<table><thead><tr><th>Qty</th><th>Method</th><th>ARK price per item</th><th>Org keeps per item</th><th>Org keeps, whole tier</th></tr></thead><tbody>${body}</tbody></table>`;
  const pdfBrowser = await chromium.launch();
  const pdfPage = await pdfBrowser.newPage();
  await pdfPage.setContent(html);
  await pdfPage.pdf({ path: path.join(outDir, "pricing.pdf"), format: "Letter", margin: { top: "0.4in", bottom: "0.4in", left: "0.4in", right: "0.4in" } });
  await pdfBrowser.close();
}

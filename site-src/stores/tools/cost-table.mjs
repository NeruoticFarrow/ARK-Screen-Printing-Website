// ARK's price behind each product in a store, for Alex only (it never goes on
// the public page). It runs ark-designer's own colour detection
// (client/src/lib/colourDetection.ts) on each print as it sits on the
// product's default colour, then ark-designer's quote math
// (client/src/lib/pricing.ts, calcPrice) with the blank's wholesale cost from
// ark-designer's catalogue (client/src/lib/products.ts). So the numbers are
// the same ones the designer and quote form would give.
//
//   node site-src/stores/tools/cost-table.mjs <ark-designer repo> <store folder>
//
// e.g. node site-src/stores/tools/cost-table.mjs ../ark-designer site-src/stores/suesgift
//
// Prints a Markdown table for the store's README. Needs Playwright's Chromium
// (not a dependency of this repo: install it or run where it's installed).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import * as esbuild from "esbuild";

const [designer, storeDir] = process.argv.slice(2).map((p) => path.resolve(p));
if (!designer || !storeDir) {
  console.error("usage: node cost-table.mjs <ark-designer repo> <store folder>");
  process.exit(1);
}
const { chromium } = createRequire(import.meta.url)("playwright");
const { PRODUCTS, GARMENTS, unitPriceCents, colourOf, garmentLook } = await import(path.join(storeDir, "catalog.mjs"));

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
import { calcPrice, canUseScreenPrint } from "@/lib/pricing";
window.ARK = { analyzeRasterImage, calcPrice, canUseScreenPrint };`,
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
const QTYS = [24, 48, 72];
const rows = [];
for (const p of PRODUCTS) {
  const garment = GARMENTS[p.garment];
  const colour = colourOf(p, p.colour);
  const locations = [];
  for (const side of ["front", "back"]) {
    const print = p.prints[side];
    if (!print) continue;
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
  const priced = await page.evaluate(([base, qtys]) => {
    const digital = window.ARK.calcPrice({ ...base, qty: 1, forceMethod: "heat_transfer" }).perUnitCost;
    const screen = qtys.map((qty) => {
      const i = { ...base, qty, forceMethod: "screen_print" };
      return window.ARK.canUseScreenPrint(i) ? window.ARK.calcPrice(i).perUnitCost : null;
    });
    return { digital, screen };
  }, [input, QTYS]);
  const retail = unitPriceCents(p, garment.sizes[0]) / 100;
  const lowest = Math.min(priced.digital, ...priced.screen.filter((v) => v !== null));
  rows.push(
    `| ${p.name} | ${garment.style}, ${money(cost)} | ${locations.map((l) => `${l.colors}${l.simulated ? " (sim)" : ""}`).join(" + ")} | ${money(priced.digital)} | ${priced.screen.map((v) => (v === null ? "n/a" : money(v))).join(" | ")} | ${money(retail)} | ${lowest < priced.digital ? `${money(retail - priced.digital)} to ${money(retail - lowest)}` : money(retail - priced.digital)} |`,
  );
}
await browser.close();

console.log(`| Product | Blank, wholesale | Ink colors, front + back | ARK price, digital (any qty) | ${QTYS.map((q) => `Screen print, ${q}`).join(" | ")} | Retail | Org keeps per item |`);
console.log(`|---|---|---|---|${QTYS.map(() => "---").join("|")}|---|---|`);
for (const r of rows) console.log(r);

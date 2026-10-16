// Refreshes the print-on-demand calculator's numbers from the creator
// platform: its public price feed (design.arkscreenprinting.com/studio/
// pricing.json) gives the reference tees' bases under the price rules in
// force — the same numbers a creator sees in the Studio. Netlify runs this
// before every build; anywhere else (CI, a laptop) it does nothing unless run
// on purpose, so the committed pages stay reproducible. Any failure keeps the
// committed copy (content/studio-pricing.json) and never fails the build.
//
// usage: npm run studio:sync   (or set STUDIO_SYNC=1)

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const FILE = path.join(ROOT, "site-src/content/studio-pricing.json");
const FEED = "https://design.arkscreenprinting.com/studio/pricing.json";

const money = (n) => typeof n === "number" && Number.isFinite(n) && n > 0 && n < 1000;

async function main() {
  const onNetlify = process.env.NETLIFY === "true";
  const asked = process.env.STUDIO_SYNC === "1" || process.argv.includes("--force") || process.env.npm_lifecycle_event === "studio:sync";
  if (!onNetlify && !asked) {
    console.log("studio: sync off outside Netlify — the calculator keeps its committed numbers");
    return;
  }
  const res = await fetch(FEED, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const garments = (Array.isArray(data?.garments) ? data.garments : [])
    .filter((g) => g && typeof g.key === "string" && money(g.dtfBase) && money(g.suggestedRetail))
    .map((g) => ({ key: g.key, label: [g.brand, g.name].filter(Boolean).join(" ").trim() || g.key, dtfBase: g.dtfBase, suggestedRetail: g.suggestedRetail }));
  if (!garments.length || !Number.isInteger(data.version) || !Number.isInteger(data.screenMinimum)) throw new Error("unexpected shape");
  const next = { source: FEED, fetchedAt: new Date().toISOString().slice(0, 10), version: data.version, screenMinimum: data.screenMinimum, garments };
  fs.writeFileSync(FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`studio: ${garments.length} reference tees under price rules v${data.version}`);
}

main().catch((error) => {
  console.warn(`studio: price feed unavailable (${error instanceof Error ? error.message : error}) — keeping the committed numbers`);
});

# Client stores

Each store ARK builds for a client lives in its own folder here:

- `stores/rmpc/`: the RMPC season store, which takes real orders through Stripe Checkout. It's the template for a store that sells: copy its catalogue, page and functions, then change the client's details.
- `stores/bots/`: the Best of the Springs store for The Gazette, a sample that doesn't take orders yet. It draws every product in every colour AS Colour makes, from garment templates (see its README).
- `stores/suesgift/`: the Sue's Gift sample store, built on the bots template. It's the starting point for the next sample (see its README).

## Rules every store follows

`rules.mjs` holds these, and each store's `catalog.mjs` reads them from there. A new store starts with them and doesn't keep its own copy.

- **Shipped orders pay a $4.50 handling fee, then shipping** (Alex, 2026-11-18).
  - Shipping is the site's rule: $8 for the first item and $3 for each additional item, $35 at most (`lib/facts.mjs`, owner 2026-10-16).
  - The most an order pays is $39.50, which is $35 of shipping plus the $4.50 fee.
  - Checkout shows the fee and shipping together as one *Shipping & handling* line.
- **Pickup orders pay neither.**
- **Prices come only from the store's catalogue.** The checkout function re-prices every line and never trusts a price from the browser.
- **Every store credits ARK in its footer.** `STORE.credit` is "Fundraising store by ARK Screen Printing", linking to https://arkscreenprinting.com for now (Alex, 2026-11-28).
- **Samples stay out of search; live stores are indexed.** `STORE.indexable` sets both the page's `<meta name="robots">` and the `X-Robots-Tag` header that `site-src/build.mjs` writes. A sample is `false` (noindex): it shows the nonprofit's logo before they've agreed to a store, and nothing can be bought. `check.mjs` fails an indexable store that isn't in `ark-site-review/sitemap.xml`.

## Every sample store

- **Tees, hoodies and a tote.** A new sample starts from `stores/suesgift/` and keeps all three garments (Alex, 2026-11-28): the AS Colour Staple Tee 5001, the Port & Company Core Fleece Hoodie PC78H and the AS Colour Carrie Tote 1001, each recolorable in every colour the blank comes in.
- **Flat retail prices.** The page shows prices that stand in for the nonprofit's own markup: tees $29.99, hoodies $59.99, totes $24.99 (front print only, so the nonprofit keeps about $6.50), with the same size upcharges.
- **ARK's pricing table, for Alex only.** Run `node tools/cost-table.mjs <ark-designer repo> stores/<slug> stores/<slug>/pricing` and put the table in the store's README and the PR. It writes two versions: `pricing.csv`/`pricing.pdf` are internal, with ARK's margin, and never leave ARK; `client-pricing.csv`/`client-pricing.pdf` show only our price, suggested retail and what the org keeps, and are the files the prospect reply attaches (Alex, 2026-11-28). It uses ark-designer's color detection (`colourDetection.ts`), the quote form's rules (`shared/creatorPricing.ts`, gang-sheet digital) and the blanks' wholesale costs (`products.ts`), and shows, for the 1–23 (digital), 24–49 and 50–100 (screen print where the colors allow) tiers, each priced at its top end, ARK's price per item, ARK's margin and what the nonprofit keeps, on both garment tiers. Margin counts each blank at its landed cost (`LANDED_EXTRA` in the script: wholesale + $0.50 for ink, emulsion and the like), and screen-print margin also subtracts press labor per impression (`SCREEN_LABOR`: $25 an hour, 100 impressions an hour, 30% on press, about $0.83 each). Screen print is priced off that cost with a 100% markup (`SCREEN_MARKUP`), a 50% margin. It never goes on the public page.
- **Garment tiers.** Samples show Premium (AS Colour). The pricing table also prices every product on Standard, ARK's mid-range blanks, at a lower suggested retail. The map is in `tiers.mjs` (Alex, 2026-11-28): tee AS Colour 5001 / Next Level 3600; long sleeve 5020 / Next Level 3601; hoodie AS Colour Stencil Hood 5102 / Independent Trading IND4000; crewneck Stencil Crew 5103 / Independent Trading SS3000 (IND3000 until SS3000 is in ARK's catalogue); tote Carrie 1001 / Liberty Bags 8501 Katelyn. A new garment kind needs an entry there or the table won't run.

## Going live

When Alex says a store is going live, do all of these in one PR:

1. Turn on checkout and drop the sample bar (`STORE.sample = false`), if it was a sample.
2. Set `STORE.indexable = true`.
3. Add the store's URL to `ark-site-review/sitemap.xml`.
4. Run `npm run build`, `node site-src/check.mjs` and `npm test`.

Merging deploys it. Search engines usually pick the page up within a few days to a couple of weeks.

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
- **ARK's pricing table, for Alex only.** Run `node tools/cost-table.mjs <ark-designer repo> stores/<slug> stores/<slug>/pricing` and put the table in the store's README and the PR; it also writes `pricing.csv` and `pricing.pdf`. It uses ark-designer's own color detection and quote math (`colourDetection.ts`, `pricing.ts`) and the blanks' wholesale costs (`products.ts`), and shows, for the 1–24, 25–49 and 50–100 tiers, ARK's price per item, the method (digital below 24, screen print where the colors allow) and what the nonprofit keeps per item and across the tier. It never goes on the public page.

## Going live

When Alex says a store is going live, do all of these in one PR:

1. Turn on checkout and drop the sample bar (`STORE.sample = false`), if it was a sample.
2. Set `STORE.indexable = true`.
3. Add the store's URL to `ark-site-review/sitemap.xml`.
4. Run `npm run build`, `node site-src/check.mjs` and `npm test`.

Merging deploys it. Search engines usually pick the page up within a few days to a couple of weeks.

# Client stores

Each store ARK builds for a client lives in its own folder here, and `stores/rmpc/` is the first. It's also the template for the next one: copy its catalogue, page and functions, then change the client's details.

## Rules every store follows

`rules.mjs` holds these, and each store's `catalog.mjs` reads them from there. A new store starts with them and doesn't keep its own copy.

- **Shipped orders pay a $4.50 handling fee, then shipping** (Alex, 2026-11-18).
  - Shipping is the site's rule: $8 for the first item and $3 for each additional item, $35 at most (`lib/facts.mjs`, owner 2026-10-16).
  - The most an order pays is $39.50, which is $35 of shipping plus the $4.50 fee.
  - Checkout shows the fee and shipping together as one *Shipping & handling* line.
- **Pickup orders pay neither.**
- **Prices come only from the store's catalogue.** The checkout function re-prices every line and never trusts a price from the browser.

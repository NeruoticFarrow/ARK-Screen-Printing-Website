# RMPC season store

`https://arkscreenprinting.com/rmpc`: Rocky Mountain Parkour Championships' 2027 season collection. It's the owner-approved sample storefront, rebuilt as readable source with the same markup and styles, and it sells for real through Stripe Checkout in ARK's Stripe account.

| What | File |
|---|---|
| Prices, garments, sizes, shipping, pickup wording, closing date | `catalog.mjs` |
| The page (React) | `app.jsx`, `icons.jsx` |
| Styles: the approved ones unchanged, plus the live-checkout additions | `styles.css`, `store.css` |
| Product photos and fonts (bundled into the page) | `images/`, `fonts/` |
| Bundles everything into `ark-site-review/rmpc.html` | `build.mjs` (run by `npm run build`) |
| Checkout: bag → Stripe Checkout session | `netlify/functions/rmpc-checkout.mjs` |
| Order export: summary page and CSVs | `netlify/functions/rmpc-orders.mjs` |
| Tests | `tests/` (`npm test`) |

## How an order flows

1. **The bag:** the buyer picks a design, garment, fit, size and quantity, then event pickup or shipping. The bag lives in their browser.
2. **Checkout:** the bag posts to `/api/rmpc/checkout`.
   - The function re-prices every line from `catalog.mjs`. It never uses a price from the browser.
   - It creates a Stripe Checkout session and the buyer pays on Stripe's page.
   - Stripe collects their name, email, phone and address, adds sales tax with Stripe Tax, and emails the receipt.
3. **Back on the store:** the buyer lands on `/rmpc?checkout=success`, which shows the confirmation and empties the bag.
4. **Production:** the order is in Stripe, tagged `metadata.channel = rmpc-store` with its garments in `metadata.items_*`.
   - `/api/rmpc/orders` lists every paid order: buyer, delivery, garments, money, refunds.
   - `/api/rmpc/sizes.csv` is the count to print.

## Settings (Netlify → Site configuration → Environment variables)

| Variable | What |
|---|---|
| `STRIPE_SECRET_KEY` | **Required.** ARK's Stripe secret or restricted key. It isn't RMPC-only: anything else on the site that takes payments can read it too. Give *Deploy Previews* a test key and *Production* the live key. Unset = the bag answers "Checkout isn't switched on yet". |
| `RMPC_ORDERS_PASSWORD` | **Required for the export.** 12+ characters. The browser asks for a user name (anything) and this password. |
| `RMPC_AUTOMATIC_TAX` | Optional. `off` stops Stripe Tax for these orders. Use it only if Stripe Tax isn't set up on the account. |

Netlify applies a changed variable at the next deploy (Deploys → Trigger deploy).

## Common changes

- **Close preorders on a date:** set `STORE.ordersCloseAt` in `catalog.mjs`, e.g. `"2027-01-10T23:59:00-07:00"`. Run `npm run build`, then commit.
  - The page shows the date.
  - After it, the page stops taking orders and the checkout function refuses them.
- **Charge more for 2XL:** set `SIZE_UPCHARGE_CENTS["2XL"]`, e.g. `200` for +$2. The page and the checkout both pick it up.
- **Change a price:** edit `PRICE_CENTS`.
- **Change the pickup wording:** edit `STORE.pickup`.
  - The owner rule is that ARK's address is never offered as a pickup counter.

## RMPC's share

The store takes the buyer price. RMPC's share is that price minus ARK's quote for the garment, which this store doesn't know. Quote A is 3-colour front + 3-colour back, Quote B is 1-colour front + 3-colour back, and the quote gives a price per run size (25 / 50 / 100) plus a 2XL upcharge.

The export's *Front print* column says which design each garment carries, so each line can be matched to its quote.

## Stripe webhooks

None needed here: the export reads the orders straight from Stripe.

The ARK designer's webhook receives these sessions' events too, because it's the same Stripe account. It leaves any session with a `metadata.channel` alone once [ark-designer#125](https://github.com/NeruoticFarrow/ark-designer/pull/125) is released. Until then, an RMPC buyer who leaves checkout gets the designer's abandoned-cart email.

## Local check

```bash
npm run build && npm run check && npm test
```

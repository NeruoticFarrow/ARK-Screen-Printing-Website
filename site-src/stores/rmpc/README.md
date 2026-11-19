# RMPC season store

`https://arkscreenprinting.com/rmpc`: Rocky Mountain Parkour Championships' 2027 season collection. It's the owner-approved sample storefront, rebuilt as readable source with the same markup and styles, and it sells for real through Stripe Checkout in ARK's Stripe account. RMPC also shows it on their own site, [embedded](#on-rmpcs-site).

| What | File |
|---|---|
| Prices, garments, sizes, delivery options and wording, closing date | `catalog.mjs` |
| The handling fee and shipping rule every store uses | `../rules.mjs` ([rules](../README.md)) |
| The page (React) | `app.jsx`, `icons.jsx` |
| Styles: the approved ones unchanged, plus the live-checkout additions | `styles.css`, `store.css` |
| Product photos and fonts (bundled into the page) | `images/`, `fonts/` |
| Bundles everything into `ark-site-review/rmpc.html` | `build.mjs` (run by `npm run build`) |
| Checkout: bag → Stripe Checkout session, and where a checkout stands | `netlify/functions/rmpc-checkout.mjs` |
| Order export: summary page and CSVs | `netlify/functions/rmpc-orders.mjs` |
| The client's view: orders, print counts, profit | `/dashboard` (`site-src/dashboard/`) |
| Order email to the client (Stripe webhook) | `netlify/functions/stripe-webhook.mjs` |
| Tests | `tests/` (`npm test`) |

## How an order flows

1. **The bag:** the buyer picks a design, garment, fit, size and quantity. Then they choose how to get the order:
   - **Event pickup:** free, at an RMPC event.
   - **Store pickup:** free, at 4852 Saddle Ridge Dr, Colorado Springs, CO 80922.
   - **Shipping:** $4.50 handling plus $8 for the first garment and $3 for each additional one, with the shipping part capped at $35.

   The bag lives in their browser.
2. **Checkout:** the bag posts to `/api/rmpc/checkout`.
   - The function re-prices every line from `catalog.mjs`. It never uses a price from the browser.
   - It creates a Stripe Checkout session and the buyer pays on Stripe's page.
   - Stripe collects their name, email, phone and address, adds sales tax with Stripe Tax, and emails the receipt.
3. **Back on the store:** the buyer lands on `/rmpc?checkout=success`, which shows the confirmation and empties the bag. A page that sent a buyer to Stripe also looks the checkout up when it next loads (`GET /api/rmpc/checkout?session_id=…`), so a bag that was paid for empties even if the buyer never came back through that link.
4. **The client hears about it:** Stripe sends `checkout.session.completed` to `/api/stripe-webhook`, which emails the order to `RMPC_ORDER_NOTIFICATION_EMAIL`: buyer name and email, delivery (city and state when shipped), garments and money. The street address and phone stay in ARK's export.
5. **Production:** the order is in Stripe, tagged `metadata.channel = rmpc-store` with its garments in `metadata.items_*`.
   - `/api/rmpc/orders` lists every paid order: buyer, delivery, garments, money, refunds.
   - `/api/rmpc/sizes.csv` is the count to print.

## Settings (Netlify → Site configuration → Environment variables)

| Variable | What |
|---|---|
| `STRIPE_SECRET_KEY` | **Required.** ARK's Stripe secret or restricted key. It isn't RMPC-only: anything else on the site that takes payments can read it too. Give *Deploy Previews* a test key and *Production* the live key. Unset = the bag answers "Checkout isn't switched on yet". |
| `RMPC_ORDERS_PASSWORD` | **Required for the export.** 12+ characters. The browser asks for a user name (anything) and this password. |
| `STRIPE_WEBHOOK_SECRET` | **Required for the order emails.** The signing secret (`whsec_…`) of the webhook endpoint below, from its page in Stripe. Not the designer's: each endpoint has its own. |
| `RESEND_API_KEY` | **Required for the order emails.** A Resend key that can send from arkscreenprinting.com, the domain the designer already sends from. |
| `RMPC_ORDER_NOTIFICATION_EMAIL` | **Required for the order emails.** Who gets each order: the client's address, or several separated by commas. |
| `RMPC_AUTOMATIC_TAX` | Optional. `off` stops Stripe Tax for these orders. Use it only if Stripe Tax isn't set up on the account. |

Netlify applies a changed variable at the next deploy (Deploys → Trigger deploy).

## Common changes

- **Close preorders on a date:** set `STORE.ordersCloseAt` in `catalog.mjs`, e.g. `"2027-01-10T23:59:00-07:00"`. Run `npm run build`, then commit.
  - The page shows the date.
  - After it, the page stops taking orders and the checkout function refuses them.
- **Charge more for 2XL:** set `SIZE_UPCHARGE_CENTS["2XL"]`, e.g. `200` for +$2. The page and the checkout both pick it up.
- **Change a price:** edit `PRICE_CENTS`.
- **Change a delivery option's wording or the store pickup address:** edit `DELIVERY`.
  - Each key is what the order records in `metadata.delivery`. `pickup` is event pickup, as earlier orders recorded it, so keep the keys as they are.
  - Store pickup at 4852 Saddle Ridge Dr is Alex's call (2026-11-18).
- **Shipping or handling:** these are every store's rule, so change them in `../rules.mjs`.
- **Embed the store on another site:** add its address to `STORE.embedOn`, e.g. `"https://shop.example.com"`. Run `npm run build`, then commit.

## On RMPC's site

RMPC shows the store on their Squarespace site, rmparkour.com, in an iframe. Paste this into a Code Block on the page. To add one, edit the page, add a block, choose **Code**, keep it in HTML mode and leave **Display Source** off.

```html
<iframe src="https://arkscreenprinting.com/rmpc" title="RMPC Season Store" style="display:block;width:100%;height:90vh;min-height:640px;border:0" allow="clipboard-write"></iframe>
```

- **Squarespace plan:** an iframe in a Code Block needs the Core, Plus or Advanced plan, or one of some legacy plans. Squarespace may also hide code blocks from you while you're logged in, so check the page in a private window.
- **Who can frame it:** the sites listed in `STORE.embedOn` (`catalog.mjs`). That list becomes the `frame-ancestors` of `/rmpc`'s Content-Security-Policy. Today it holds rmparkour.com, www.rmparkour.com and Squarespace's own domains, which serve its editor and previews. Any other site shows an empty frame.
- **Size:** the frame has a fixed height and scrolls inside. That way the product and bag panels open inside it, where the buyer can see them.
- **Checkout:** Stripe Checkout can't load inside a frame, so the Checkout button sends the whole tab to Stripe. If the page around the store stops that, the bag shows a *Continue to secure checkout* link instead.
- **After paying:** Stripe returns the buyer to `arkscreenprinting.com/rmpc`, which reads the order back from Stripe and shows it.
  - Browsers keep a framed page's storage separate for each site, so the embedded store's bag isn't there.
  - The embedded store empties its own bag the next time it loads, once the checkout lookup says the order went through.
- **Leaving checkout:** for embedded orders Stripe shows no back link, because it would land on arkscreenprinting.com, where that bag isn't. The browser's Back button returns the buyer to RMPC's page with the bag as it was.

## RMPC's share

The store takes the buyer price. RMPC's share is that price minus ARK's quote for the garment, which this store doesn't know. Quote A is 3-colour front + 3-colour back, Quote B is 1-colour front + 3-colour back, and the quote gives a price per run size (25 / 50 / 100) plus a 2XL upcharge.

The export's *Front print* column says which design each garment carries, so each line can be matched to its quote.

## Stripe webhooks

One, for the client's order emails. In Stripe → Developers → Webhooks, add an endpoint:

- **URL:** `https://arkscreenprinting.com/api/stripe-webhook`
- **Events:** `checkout.session.completed` and `checkout.session.async_payment_succeeded`

Then put its signing secret in Netlify as `STRIPE_WEBHOOK_SECRET`. The endpoint gets every Checkout session on the account and answers anything that isn't this store's with a 200 and nothing else. A failed email is answered 500, so Stripe retries it, and Resend's idempotency key stops a retry from sending it twice. The export doesn't need the webhook: it reads the orders straight from Stripe.

The ARK designer's webhook receives these sessions' events too, because it's the same Stripe account. It leaves any session with a `metadata.channel` alone once [ark-designer#125](https://github.com/NeruoticFarrow/ark-designer/pull/125) is released. Until then, an RMPC buyer who leaves checkout gets the designer's abandoned-cart email.

## Local check

```bash
npm run build && npm run check && npm test
```

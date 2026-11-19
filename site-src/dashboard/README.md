# Client store dashboard

`arkscreenprinting.com/dashboard` is where the client of each made-for-you store signs in to see their orders, print counts and profit. ARK's people see every store, and they also get the **ARK settings** page. It is laid out like the Creator Studio (ark-designer), with the same Verdara colours and fonts and the same rail of sections. It is simpler than the Studio: clients look at their store here, and ARK still runs it.

| Piece | Where |
| --- | --- |
| The page (React, one self-contained file) | `site-src/dashboard/app.jsx`, built by `build.mjs` into `ark-site-review/dashboard.html` |
| The API, `/api/dashboard/…` | `netlify/functions/dashboard-api.mjs` |
| Sign-in codes, links and sessions | `netlify/lib/dashboard/auth.mjs` |
| Who may see which store | `netlify/lib/dashboard/access.mjs` |
| The stores it knows, and how each one's costs are laid out | `netlify/lib/dashboard/stores.mjs` |
| Totals, profit, cost sheets, spreadsheets (pure, unit-tested) | `netlify/lib/dashboard/report.mjs` |
| Storage (Netlify Blobs) | `netlify/lib/dashboard/storage.mjs` |

## What each person sees

- **A client** (an address on the store's list) sees:
  - **Overview:** orders, garment sales, profit so far, what ARK has paid them, how each print run is going, and the latest orders.
  - **Orders:** every order, with search and a delivery filter (event pickup, store pickup, shipping). It also has a spreadsheet download and a printable pickup list with a tick box per order.
  - **Print counts:** a grid per product, with garments by size, and a spreadsheet.
  - **Profit:** the sum, the payments from ARK, how the profit is worked out, and a line per garment.

  A client sees each buyer's name, email and delivery, plus the town and state when an order ships. That's the same as the order email. Street addresses and phones stay in ARK's export (`/api/rmpc/orders`).
- **ARK** (an address in `DASHBOARD_ADMIN_EMAILS`) sees every store, and the **ARK settings** page has three sections for each store:
  - **Who can see this store:** the client email addresses. It offers the addresses that already get the order emails.
  - **ARK's price per garment:** the cost sheet. You can type it in the grid or paste it whole.
  - **Payments to the client:** what ARK has paid and when. The client sees each payment.

## Signing in

There are no passwords. Someone types their email address and gets a 6-digit code and a one-tap link, the way the Studio signs creators in.

- A code works for 15 minutes and for 5 tries. Only the newest code counts.
- An address gets at most 5 codes an hour, and one every 30 seconds.
- Only an address that can see a store gets an email. Every address gets the same answer on screen, so the form doesn't tell anyone who is a client.
- A session lasts 30 days, in an HttpOnly `__Host-` cookie. The cookie carries only the session; what the person may see is looked up on every request. Taking an address off a list locks it out straight away, and signing out ends that session.
- Codes, links and session tokens are stored only as SHA-256 hashes.

## Profit

- Each garment earns what the buyer paid for it, less ARK's price for that garment.
- ARK's price comes from the store's cost sheet. For each design group and blank, it gives a price at each run size (25 / 50 / 100 for RMPC), plus an upcharge for adult 2XL.
- The run is every garment sold with the same front print, tees and crewnecks together. Under the second break (50), a run pays the first break's price (25). ARK's price can only drop as more sell, so until orders close the page says *so far*.
- A fully refunded order doesn't count. A partial refund comes off profit, but never more than the order's garment money.
- Shipping & handling goes to ARK for postage, sales tax goes to the state, and Stripe's card fees are ARK's.
- Owed = profit − payments recorded, never below zero, and nothing is owed until there's a cost sheet.

**The prices are ARK's quote to the client, so they never go in this repository, which is public.** They live in Netlify Blobs, saved from the ARK settings page. The same goes for client lists and payments.

## Settings (Netlify → Site configuration → Environment variables)

| Variable | |
| --- | --- |
| `DASHBOARD_ADMIN_EMAILS` | **New, required.** ARK's addresses, comma-separated, e.g. `alex@arkscreenprinting.com`. They see every store and the ARK settings page. |
| `RESEND_API_KEY` | Already set for the order emails. It sends the sign-in emails from `orders@arkscreenprinting.com`. Without it, sign-in says it isn't switched on yet. |
| `STRIPE_SECRET_KEY` | Already set for the checkout. It reads the orders. |

Storage needs no setup, because Netlify Blobs is built in. Production uses the `client-dashboard` store. Deploy previews, branch deploys and local dev each get their own store, so trying a preview never touches the live lists.

## Setting up a store's dashboard

1. Sign in at `/dashboard` with an address in `DASHBOARD_ADMIN_EMAILS`.
2. On **ARK settings**:
   - Add the client's email addresses and press **Save the list**.
   - Paste the cost sheet under **Paste a whole cost sheet**, press **Fill in the grid**, check it, and press **Save the prices**.
3. Tell the client to sign in at `arkscreenprinting.com/dashboard` with that address.

A cost sheet is JSON in dollars, by design group and blank. The run sizes are keys, and the upcharge is `upcharge` or `2XL`:

```json
{ "groups": { "athlete": { "gildan-adult": { "25": "0.00", "50": "0.00", "100": "0.00", "upcharge": "0.00" } } } }
```

## Adding a store

The store needs a checkout that tags its Stripe Checkout sessions with a `metadata.channel` of its own, as RMPC's does. Then add an entry to `netlify/lib/dashboard/stores.mjs`. The entry says:

- how to read the store's paid orders
- how to describe a garment line
- the store's delivery kinds
- its cost layout: design groups, blanks, run sizes and upcharge sizes

Best of the Springs joins once its checkout exists.

## Checks

- `npm test` runs the dashboard's tests (`site-src/dashboard/tests/`), alongside the stores'. They cover sign-in, access, the profit rule and the API end to end, with memory storage and a fake Stripe. Test prices are made up.
- `npm run check` checks the built page:
  - it is noindex and loads nothing from another origin
  - it has no analytics
  - its headers run only this exact bundle, by its SHA-256 hash, never `'unsafe-inline'`
  - it can't be framed and sends no referrer

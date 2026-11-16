// POST /api/rmpc/checkout — turns an RMPC store bag into a Stripe Checkout
// session in ARK's Stripe account and answers with the link to pay.
//
// GET /api/rmpc/checkout?session_id=cs_… — where a checkout the store started
// stands: open, complete or expired. The page asks when it finds a checkout it
// started, so it can empty a bag that was paid for even when Stripe sent the
// buyer back somewhere else, as it does from the store embedded on RMPC's own
// site. The answer is the garments and the order reference, never the buyer.
//
// Trust boundary: the browser sends only what was chosen (product, garment,
// size, quantity, pickup or shipping). Every price, the shipping charge and the
// line names come from site-src/stores/rmpc/catalog.mjs. Stripe then collects
// the buyer's name, email, phone and address, works out sales tax (Stripe Tax,
// as the ARK designer's checkout does) and emails the receipt.
//
// Environment (Netlify → Site configuration → Environment variables):
//   STRIPE_SECRET_KEY    required. ARK's Stripe secret or restricted key,
//                        shared with anything else on the site that takes
//                        payments. Use a test key (sk_test_…/rk_test_…) for
//                        deploy previews and the live key for production.
//                        Unset = checkout answers "isn't switched on yet".
//   RMPC_AUTOMATIC_TAX   optional. "off" stops Stripe Tax for these orders
//                        (only if Stripe Tax isn't set up on the account).

import { STORE, SHIPPING_RULE_TEXT, decodeItems, encodeItems, orderRef, ordersClosed, priceOrder } from "../../site-src/stores/rmpc/catalog.mjs";
import { stripeRequest } from "../lib/stripe.mjs";

export const config = { path: "/api/rmpc/checkout" };

const MAX_BODY_CHARS = 20_000;
// A Checkout session id, and nothing else, goes into the Stripe URL below.
const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,240}$/;

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

/** The Checkout session for a priced order (catalog.mjs priceOrder).
 *  `embedded`: the bag came from the store shown in an iframe on RMPC's site. */
export function sessionParams(order, origin, { automaticTax = true, embedded = false } = {}) {
  const ship = order.delivery === "ship";
  const metadata = { channel: STORE.channel, delivery: order.delivery, garments: String(order.count), ...encodeItems(order.lines) };
  const fulfilment = ship
    ? "This is a preorder: ARK Screen Printing prints the collection in Colorado Springs after orders close, then ships your order."
    : `This is a preorder: ARK Screen Printing prints the collection in Colorado Springs after orders close. ${STORE.pickup.sentence}`;
  return {
    mode: "payment",
    line_items: order.lines.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency: STORE.currency,
        unit_amount: line.unitCents,
        product_data: { name: line.name, description: line.detail },
      },
    })),
    phone_number_collection: { enabled: true },
    // Stripe Tax needs an address: the shipping address when it ships, the
    // billing address for pickup.
    billing_address_collection: ship ? "auto" : "required",
    ...(ship
      ? {
          shipping_address_collection: { allowed_countries: STORE.shipping.countries },
          shipping_options: [{
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: order.shippingCents, currency: STORE.currency },
              display_name: "Standard shipping",
            },
          }],
        }
      : {}),
    automatic_tax: { enabled: automaticTax },
    custom_text: {
      submit: { message: fulfilment },
      ...(ship ? { shipping_address: { message: `Shipping is ${SHIPPING_RULE_TEXT}. U.S. addresses only.` } } : {}),
    },
    metadata,
    payment_intent_data: { description: STORE.orderDescription, metadata },
    success_url: `${origin}${STORE.path}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    // Stripe's back link goes to cancel_url. From the embedded store, that
    // would land on arkscreenprinting.com, where the bag isn't: an iframe
    // keeps its own storage. Without it, the browser's Back button returns
    // the buyer to RMPC's page with the bag as it was.
    ...(embedded ? {} : { cancel_url: `${origin}${STORE.path}?checkout=cancelled` }),
  };
}

/** GET ?session_id=: one of this store's checkouts, as the page needs it. */
async function checkoutStatus(req, secretKey, fetchImpl) {
  const id = new URL(req.url).searchParams.get("session_id") ?? "";
  if (!SESSION_ID.test(id)) return json(400, { error: "That isn't a checkout." });
  let session;
  try {
    session = await stripeRequest(secretKey, "GET", `/v1/checkout/sessions/${id}`, null, { fetchImpl });
  } catch (err) {
    if (err?.status === 404) return json(404, { error: "No such checkout." });
    console.error(`[rmpc-checkout] Stripe couldn't look up a checkout: ${err?.message ?? err}`);
    return json(502, { error: "Checkout is unavailable right now." });
  }
  // Other checkouts on ARK's account aren't this store's to describe.
  if (session?.metadata?.channel !== STORE.channel) return json(404, { error: "No such checkout." });
  return json(200, {
    status: session.status,
    paid: session.payment_status === "paid",
    ref: orderRef(session.id),
    delivery: session.metadata.delivery === "ship" ? "ship" : "pickup",
    lines: decodeItems(session.metadata).map(({ productId, variant, size, quantity }) => ({ productId, variant, size, quantity })),
  });
}

export function createCheckoutHandler({ env = process.env, fetchImpl = fetch, now = () => Date.now() } = {}) {
  return async function handler(req) {
    if (req.method !== "POST" && req.method !== "GET") return json(405, { error: "Use POST." });
    const secretKey = env.STRIPE_SECRET_KEY;
    if (!secretKey) return json(503, { error: "Checkout isn't switched on yet. Please try again soon." });
    if (req.method === "GET") return checkoutStatus(req, secretKey, fetchImpl);
    if (ordersClosed(now())) return json(409, { error: "Preorders for this season are closed." });
    // JSON only: a cross-site form post can't send it, and a cross-site
    // fetch with it needs a CORS preflight this function never answers.
    if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return json(415, { error: "Send the bag as JSON." });
    }

    let input;
    try {
      const text = await req.text();
      if (text.length > MAX_BODY_CHARS) return json(413, { error: "That bag is too large. Split it into two orders." });
      input = JSON.parse(text);
    } catch {
      return json(400, { error: "We couldn't read your bag. Refresh the page and try again." });
    }

    const order = priceOrder(input);
    if (!order.ok) return json(400, { error: order.error });

    const origin = new URL(req.url).origin;
    try {
      const session = await stripeRequest(secretKey, "POST", "/v1/checkout/sessions",
        sessionParams(order, origin, { automaticTax: env.RMPC_AUTOMATIC_TAX !== "off", embedded: input?.embedded === true }), { fetchImpl });
      if (!session?.url) throw new Error("Stripe did not return a checkout link");
      // The id lets the page look this checkout up later (GET above).
      return json(200, { url: session.url, id: session.id });
    } catch (err) {
      // Stripe's message names the setting at fault (a missing key
      // permission, Stripe Tax not set up); it goes to the function log, not
      // to the buyer.
      console.error(`[rmpc-checkout] Stripe refused the session: ${err?.message ?? err}`);
      return json(502, { error: "Checkout is unavailable right now. Please try again in a few minutes." });
    }
  };
}

export default createCheckoutHandler();

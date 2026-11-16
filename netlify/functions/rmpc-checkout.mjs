// POST /api/rmpc/checkout — turns an RMPC store bag into a Stripe Checkout
// session in ARK's Stripe account and answers with the link to pay.
//
// Trust boundary: the browser sends only what was chosen (product, garment,
// size, quantity, pickup or shipping). Every price, the shipping charge and the
// line names come from site-src/stores/rmpc/catalog.mjs. Stripe then collects
// the buyer's name, email, phone and address, works out sales tax (Stripe Tax,
// as the ARK designer's checkout does) and emails the receipt.
//
// Environment (Netlify → Site configuration → Environment variables):
//   RMPC_STRIPE_SECRET_KEY  required. A Stripe secret or restricted key. Use a
//                           test key (sk_test_…/rk_test_…) for deploy previews
//                           and the live key for production. Unset = checkout
//                           answers "isn't switched on yet".
//   RMPC_AUTOMATIC_TAX      optional. "off" stops Stripe Tax for these orders
//                           (only if Stripe Tax isn't set up on the account).

import { STORE, SHIPPING_RULE_TEXT, encodeItems, ordersClosed, priceOrder } from "../../site-src/stores/rmpc/catalog.mjs";
import { stripeRequest } from "../lib/stripe.mjs";

export const config = { path: "/api/rmpc/checkout" };

const MAX_BODY_CHARS = 20_000;

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

/** The Checkout session for a priced order (catalog.mjs priceOrder). */
export function sessionParams(order, origin, { automaticTax = true } = {}) {
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
    cancel_url: `${origin}${STORE.path}?checkout=cancelled`,
  };
}

export function createCheckoutHandler({ env = process.env, fetchImpl = fetch, now = () => Date.now() } = {}) {
  return async function handler(req) {
    if (req.method !== "POST") return json(405, { error: "Use POST." });
    const secretKey = env.RMPC_STRIPE_SECRET_KEY;
    if (!secretKey) return json(503, { error: "Checkout isn't switched on yet. Please try again soon." });
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
        sessionParams(order, origin, { automaticTax: env.RMPC_AUTOMATIC_TAX !== "off" }), { fetchImpl });
      if (!session?.url) throw new Error("Stripe did not return a checkout link");
      return json(200, { url: session.url });
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

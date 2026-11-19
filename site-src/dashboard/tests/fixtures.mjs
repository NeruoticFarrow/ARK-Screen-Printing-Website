// Shared test fixtures: RMPC Checkout sessions as Stripe returns them, a fake
// Stripe, predictable randomness, and a cost sheet. The prices here are made
// up; ARK's real quotes never go in this repository.

import crypto from "node:crypto";
import { encodeItems } from "../../stores/rmpc/catalog.mjs";

let serial = 0;

/** A paid RMPC Checkout session. `lines` are [productId, variant, size, qty, unitCents]. */
export function session({ lines = [["wordmark-tee", "gildan-adult", "M", 1, 2999]], delivery = "pickup", name = "Sam Taylor", email = "sam@example.com", created = 1_799_000_000 + serial, refunded = 0, shipping, tax = 0, channel = "rmpc-store", city = "Pueblo", state = "CO" } = {}) {
  serial += 1;
  const items = lines.map(([productId, variant, size, quantity, unitCents]) => ({ productId, variant, size, quantity, unitCents }));
  const subtotal = items.reduce((n, i) => n + i.quantity * i.unitCents, 0);
  const ship = shipping ?? (delivery === "ship" ? 1250 : 0);
  return {
    // Unique, like Stripe's: the order reference is the id's last 8 characters.
    id: `cs_test_a1${crypto.createHash("sha256").update(String(serial)).digest("hex").slice(0, 24)}`,
    created,
    status: "complete",
    payment_status: "paid",
    metadata: { channel, delivery, ...encodeItems(items) },
    customer_details: { name, email, phone: "+17195550100" },
    collected_information: delivery === "ship" ? { shipping_details: { name, address: { line1: "12 Secret Street", line2: null, city, state, postal_code: "81003", country: "US" } } } : null,
    amount_subtotal: subtotal,
    amount_total: subtotal + ship + tax,
    total_details: { amount_shipping: ship, amount_tax: tax, amount_discount: 0 },
    payment_intent: { id: `pi_${serial}`, latest_charge: { id: `ch_${serial}`, amount_refunded: refunded } },
  };
}

/** Answers Stripe's Checkout session list with `sessions`. */
export function fakeStripe(sessions, { status = 200 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    if (status !== 200) return new Response(JSON.stringify({ error: { message: "Invalid API Key provided" } }), { status });
    return new Response(JSON.stringify({ object: "list", data: [...sessions].reverse(), has_more: false }), { status: 200 });
  };
  return { calls, fetchImpl };
}

/** crypto's randomInt and randomBytes, but predictable. */
export function fakeRandom(code = 123456) {
  let fill = 0;
  return {
    randomInt: () => code,
    randomBytes: (size) => {
      fill = (fill + 1) % 256;
      return Buffer.alloc(size, fill);
    },
  };
}

/** A made-up cost sheet in dollars, the shape ARK pastes. */
export const SHEET_DOLLARS = {
  athlete: {
    "gildan-adult": { 25: "20.00", 50: "15.00", 100: "10.00", upcharge: "2.00" },
    "gildan-youth": { 25: "19.00", 50: "14.00", 100: "9.00" },
    "next-level-adult": { 25: "22.00", 50: "17.00", 100: "12.00", upcharge: "1.50" },
    "next-level-youth": { 25: "20.00", 50: "15.00", 100: "10.00" },
    "independent-adult": { 25: "40.00", 50: "35.00", 100: "30.00", upcharge: "3.00" },
    "independent-youth": { 25: "35.00", 50: "30.00", 100: "25.00" },
  },
  wordmark: {
    "gildan-adult": { 25: "$16.00", 50: "$12.00", 100: "$8.00", "2XL": "$2.00" },
    "gildan-youth": { 25: 15, 50: 11, 100: 7 },
    "next-level-adult": { 25: "18.00", 50: "14.00", 100: "10.00", upcharge: "1.50" },
    "next-level-youth": { 25: "16.00", 50: "12.00", 100: "8.00" },
    "independent-adult": { 25: "36.00", 50: "32.00", 100: "28.00", upcharge: "3.00" },
    "independent-youth": { 25: "31.00", 50: "27.00", 100: "23.00" },
  },
};

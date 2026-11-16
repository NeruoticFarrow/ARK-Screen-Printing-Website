import assert from "node:assert/strict";
import test from "node:test";
import { createCheckoutHandler } from "../../../../netlify/functions/rmpc-checkout.mjs";
import { createOrdersHandler, ordersCsv, sizesCsv, toOrder } from "../../../../netlify/functions/rmpc-orders.mjs";
import { encodeForm } from "../../../../netlify/lib/stripe.mjs";
import { encodeItems } from "../catalog.mjs";

const KEY = "sk_test_unit";
const ORIGIN = "https://arkscreenprinting.com";

function checkoutRequest(body, headers = { "Content-Type": "application/json" }) {
  return new Request(`${ORIGIN}/api/rmpc/checkout`, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
}

function fakeStripe(response = { id: "cs_test_123", url: "https://checkout.stripe.com/c/pay/cs_test_123" }, status = 200) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init, form: new URLSearchParams(init.body ?? new URL(url).search) });
    return new Response(JSON.stringify(response), { status });
  };
  return { calls, fetchImpl };
}

const BAG = { delivery: "pickup", lines: [{ productId: "wordmark-tee", variant: "next-level-adult", size: "XL", quantity: 3 }] };

test("encodeForm writes Stripe's nested form fields", () => {
  const form = encodeForm({ a: 1, b: { c: "x", d: [{ e: 2 }, "f"] }, skip: undefined, none: null, t: true });
  assert.deepEqual([...form.entries()], [["a", "1"], ["b[c]", "x"], ["b[d][0][e]", "2"], ["b[d][1]", "f"], ["t", "true"]]);
});

test("checkout creates a Stripe session priced from the catalogue", async () => {
  const stripe = fakeStripe();
  const handler = createCheckoutHandler({ env: { RMPC_STRIPE_SECRET_KEY: KEY }, fetchImpl: stripe.fetchImpl });
  const res = await handler(checkoutRequest({ ...BAG, lines: [{ ...BAG.lines[0], unitCents: 1 }] }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { url: "https://checkout.stripe.com/c/pay/cs_test_123" });
  assert.equal(stripe.calls.length, 1);
  const { url, init, form } = stripe.calls[0];
  assert.equal(url, "https://api.stripe.com/v1/checkout/sessions");
  assert.equal(init.method, "POST");
  assert.equal(init.headers.Authorization, `Bearer ${KEY}`);
  assert.equal(init.headers["Stripe-Version"], "2026-06-24.dahlia");
  assert.equal(form.get("mode"), "payment");
  assert.equal(form.get("line_items[0][quantity]"), "3");
  assert.equal(form.get("line_items[0][price_data][unit_amount]"), "2999");
  assert.equal(form.get("line_items[0][price_data][product_data][name]"), "RMPC Team Tee");
  assert.equal(form.get("line_items[0][price_data][product_data][description]"), "Next Level 3600 · Adult · XL · Black");
  assert.equal(form.get("automatic_tax[enabled]"), "true");
  assert.equal(form.get("billing_address_collection"), "required", "pickup orders give Stripe Tax a billing address");
  assert.equal(form.get("shipping_address_collection[allowed_countries][0]"), null, "pickup collects no shipping address");
  assert.equal(form.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]"), null);
  assert.equal(form.get("metadata[channel]"), "rmpc-store");
  assert.equal(form.get("metadata[delivery]"), "pickup");
  assert.equal(form.get("metadata[items_1]"), "wordmark-tee|next-level-adult|XL|3|2999");
  assert.equal(form.get("payment_intent_data[metadata][channel]"), "rmpc-store");
  assert.equal(form.get("success_url"), `${ORIGIN}/rmpc?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  assert.equal(form.get("cancel_url"), `${ORIGIN}/rmpc?checkout=cancelled`);
});

test("shipped orders collect a U.S. address and pay the shipping rule", async () => {
  const stripe = fakeStripe();
  const handler = createCheckoutHandler({ env: { RMPC_STRIPE_SECRET_KEY: KEY, RMPC_AUTOMATIC_TAX: "off" }, fetchImpl: stripe.fetchImpl });
  const res = await handler(checkoutRequest({ ...BAG, delivery: "ship" }));
  assert.equal(res.status, 200);
  const { form } = stripe.calls[0];
  assert.equal(form.get("shipping_address_collection[allowed_countries][0]"), "US");
  assert.equal(form.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]"), "1400");
  assert.equal(form.get("billing_address_collection"), "auto");
  assert.equal(form.get("automatic_tax[enabled]"), "false");
});

test("checkout refuses politely when it can't take the order", async () => {
  const stripe = fakeStripe();
  const live = createCheckoutHandler({ env: { RMPC_STRIPE_SECRET_KEY: KEY }, fetchImpl: stripe.fetchImpl });
  assert.equal((await createCheckoutHandler({ env: {}, fetchImpl: stripe.fetchImpl })(checkoutRequest(BAG))).status, 503, "no key yet");
  assert.equal((await live(new Request(`${ORIGIN}/api/rmpc/checkout`))).status, 405);
  assert.equal((await live(checkoutRequest(BAG, { "Content-Type": "text/plain" }))).status, 415);
  assert.equal((await live(checkoutRequest("{not json"))).status, 400);
  const bad = await live(checkoutRequest({ delivery: "pickup", lines: [{ productId: "wordmark-tee", variant: "gildan-adult", size: "5XL", quantity: 1 }] }));
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error, /isn't available/);
  assert.equal(stripe.calls.length, 0, "nothing reached Stripe");

  const refused = createCheckoutHandler({ env: { RMPC_STRIPE_SECRET_KEY: KEY }, fetchImpl: fakeStripe({ error: { message: "Stripe Tax is not set up" } }, 400).fetchImpl });
  const original = console.error;
  console.error = () => {};
  try {
    const res = await refused(checkoutRequest(BAG));
    assert.equal(res.status, 502);
    assert.doesNotMatch((await res.json()).error, /Stripe Tax/, "Stripe's message stays in the log");
  } finally {
    console.error = original;
  }
});

function session(overrides = {}) {
  const lines = [
    { productId: "wordmark-tee", variant: "gildan-youth", size: "M", quantity: 2, unitCents: 2999 },
    { productId: "athlete-crew", variant: "independent-adult", size: "2XL", quantity: 1, unitCents: 5999 },
  ];
  return {
    id: "cs_live_aaaaaaaaaaaaZZZZ1234",
    created: 1_799_000_000,
    status: "complete",
    payment_status: "paid",
    metadata: { channel: "rmpc-store", delivery: "ship", garments: "3", ...encodeItems(lines) },
    customer_details: { name: "=Sam Taylor", email: "sam@example.com", phone: "+17195550100" },
    collected_information: { shipping_details: { name: "Sam Taylor", address: { line1: "1 Main St", line2: null, city: "Colorado Springs", state: "CO", postal_code: "80903", country: "US" } } },
    amount_subtotal: 11997,
    amount_total: 14353,
    total_details: { amount_shipping: 1400, amount_tax: 956, amount_discount: 0 },
    payment_intent: { id: "pi_1", latest_charge: { id: "ch_1", amount_refunded: 0 } },
    ...overrides,
  };
}

test("the export reads orders, buyers and garments from the sessions", () => {
  const order = toOrder(session());
  assert.equal(order.ref, "ZZZZ1234");
  assert.equal(order.status, "Paid");
  assert.equal(order.delivery, "Ship");
  assert.equal(order.shipTo, "Sam Taylor, 1 Main St, Colorado Springs, CO 80903");
  const csv = ordersCsv([order]).trim().split("\r\n");
  assert.equal(csv.length, 3, "header + one row per garment line");
  assert.match(csv[1], /^ZZZZ1234,/);
  assert.match(csv[1], /,'=Sam Taylor,/, "a formula-looking name is neutralised");
  assert.match(csv[1], /,RMPC Team Tee,Team wordmark,Gildan 5000B,Youth,M,Black,2,29\.99,59\.98,119\.97,14\.00,9\.56,143\.53,0\.00$/);
  assert.match(csv[2], /,RMPC Athlete Crewneck,Athlete graphic,Independent SS3000,Adult,2XL,Black,1,59\.99,59\.99,,,,,$/, "order money only once");
  const refunded = toOrder(session({ id: "cs_live_bbbbbbbbbbbbYYYY0000", payment_intent: { latest_charge: { amount_refunded: 14353 } } }));
  assert.equal(refunded.status, "Refunded");
  const sizes = sizesCsv([order, refunded]).trim().split("\r\n");
  assert.deepEqual(sizes, [
    "Product,Front print,Garment,Fit,Size,Colour,Qty",
    "RMPC Team Tee,Team wordmark,Gildan 5000B,Youth,M,Black,2",
    "RMPC Athlete Crewneck,Athlete graphic,Independent SS3000,Adult,2XL,Black,1",
    "Total,,,,,,3",
  ], "a refunded order isn't printed");
});

test("the export is locked without the password and lists only this store's paid sessions", async () => {
  const pages = [
    { data: [session(), session({ id: "cs_live_designer_order_1", metadata: {} }), session({ id: "cs_live_unpaid_xxxxxxxx", payment_status: "unpaid" })], has_more: true },
    { data: [session({ id: "cs_live_cccccccccccc9999ABCD" })], has_more: false },
  ];
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(new URL(url));
    return new Response(JSON.stringify(pages[calls.length - 1]), { status: 200 });
  };
  const password = "correct horse battery";
  const handler = createOrdersHandler({ env: { RMPC_STRIPE_SECRET_KEY: KEY, RMPC_ORDERS_PASSWORD: password }, fetchImpl });
  const get = (path, pass) => handler(new Request(`${ORIGIN}${path}`, { headers: pass === undefined ? {} : { Authorization: `Basic ${Buffer.from(`ark:${pass}`).toString("base64")}` } }));

  assert.equal((await createOrdersHandler({ env: { RMPC_ORDERS_PASSWORD: "short" }, fetchImpl })(new Request(`${ORIGIN}/api/rmpc/orders`))).status, 503);
  const anonymous = await get("/api/rmpc/orders");
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers.get("www-authenticate"), /^Basic /);
  assert.equal((await get("/api/rmpc/orders", "wrong password here")).status, 401);
  assert.equal(calls.length, 0, "Stripe isn't read before the password checks out");

  const res = await get("/api/rmpc/orders.csv", password);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/csv/);
  const rows = (await res.text()).trim().split("\r\n");
  assert.deepEqual(rows.slice(1).map((r) => r.split(",")[0]), ["ZZZZ1234", "ZZZZ1234", "9999ABCD", "9999ABCD"]);
  assert.equal(calls.length, 2, "follows Stripe's pages");
  assert.equal(calls[0].searchParams.get("status"), "complete");
  assert.equal(calls[0].searchParams.get("expand[0]"), "data.payment_intent.latest_charge");
  assert.ok(Number(calls[0].searchParams.get("created[gte]")) > 0);
  assert.equal(calls[1].searchParams.get("starting_after"), "cs_live_unpaid_xxxxxxxx");
});

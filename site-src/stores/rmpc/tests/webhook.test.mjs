import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { createStripeWebhookHandler, orderEmail, recipients, verifySignature } from "../../../../netlify/functions/stripe-webhook.mjs";
import { encodeItems } from "../catalog.mjs";

const SECRET = "whsec_test_unit";
const NOW = 1_799_000_100;
const ORIGIN = "https://arkscreenprinting.com";

const sign = (payload, { secret = SECRET, t = NOW } = {}) =>
  `t=${t},v1=${crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;

function rmpcSession(overrides = {}) {
  const lines = [
    { productId: "wordmark-tee", variant: "gildan-youth", size: "M", quantity: 2, unitCents: 2999 },
    { productId: "athlete-crew", variant: "independent-adult", size: "2XL", quantity: 1, unitCents: 5999 },
  ];
  return {
    id: "cs_live_aaaaaaaaaaaaZZZZ1234",
    object: "checkout.session",
    created: 1_799_000_000,
    status: "complete",
    payment_status: "paid",
    payment_intent: "pi_1",
    metadata: { channel: "rmpc-store", delivery: "ship", garments: "3", ...encodeItems(lines) },
    customer_details: { name: "Sam <b>Taylor</b>", email: "sam@example.com", phone: "+17195550100" },
    collected_information: { shipping_details: { name: "Sam Taylor", address: { line1: "1 Main St", line2: null, city: "Colorado Springs", state: "CO", postal_code: "80903", country: "US" } } },
    amount_subtotal: 11997,
    amount_total: 14353,
    total_details: { amount_shipping: 1400, amount_tax: 956, amount_discount: 0 },
    ...overrides,
  };
}

function eventFor(session, type = "checkout.session.completed") {
  return JSON.stringify({ id: `evt_${session.id}`, object: "event", type, data: { object: session } });
}

function fakeResend(status = 200) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(status < 300 ? { id: "email_1" } : { message: "The arkscreenprinting.com domain is not verified." }), { status });
  };
  return { calls, fetchImpl };
}

const ENV = { STRIPE_WEBHOOK_SECRET: SECRET, RESEND_API_KEY: "re_test_unit", RMPC_ORDER_NOTIFICATION_EMAIL: "client@rmpc.example, alex@arkscreenprinting.com" };

function deliver(handler, payload, signature = sign(payload)) {
  return handler(new Request(`${ORIGIN}/api/stripe-webhook`, { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": signature }, body: payload }));
}

async function quietly(fn) {
  const { error, warn } = console;
  console.error = () => {};
  console.warn = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, { error, warn });
  }
}

test("only Stripe's own signature, made with this endpoint's secret and recently, is accepted", () => {
  const payload = eventFor(rmpcSession());
  assert.equal(verifySignature(payload, sign(payload), SECRET, NOW), true);
  assert.equal(verifySignature(payload, `${sign(payload, { secret: "whsec_other" })},${sign(payload).split(",")[1]}`, SECRET, NOW), true, "any v1 may match");
  assert.equal(verifySignature(payload, sign(payload, { secret: "whsec_other" }), SECRET, NOW), false, "another endpoint's secret");
  assert.equal(verifySignature(`${payload} `, sign(payload), SECRET, NOW), false, "a changed body");
  assert.equal(verifySignature(payload, sign(payload, { t: NOW - 301 }), SECRET, NOW), false, "a replay from over five minutes ago");
  assert.equal(verifySignature(payload, "t=abc,v1=00", SECRET, NOW), false);
  assert.equal(verifySignature(payload, null, SECRET, NOW), false);
  assert.equal(verifySignature(payload, sign(payload), "", NOW), false);
});

test("the notification list takes commas and ignores what isn't an address", () => {
  assert.deepEqual(recipients(" client@rmpc.example , alex@arkscreenprinting.com,,not-an-email "), ["client@rmpc.example", "alex@arkscreenprinting.com"]);
  assert.deepEqual(recipients(undefined), []);
});

test("a paid RMPC order emails the client once, through Resend, from ARK's sender", async () => {
  const resend = fakeResend();
  const handler = createStripeWebhookHandler({ env: ENV, fetchImpl: resend.fetchImpl, now: () => NOW * 1000 });
  const res = await deliver(handler, eventFor(rmpcSession()));
  assert.equal(res.status, 200);
  assert.equal(resend.calls.length, 1);
  const { url, init, body } = resend.calls[0];
  assert.equal(url, "https://api.resend.com/emails");
  assert.equal(init.headers.Authorization, "Bearer re_test_unit");
  assert.equal(init.headers["Idempotency-Key"], "rmpc-store/order/cs_live_aaaaaaaaaaaaZZZZ1234", "a redelivered event can't send it twice");
  assert.equal(body.from, "ARK Screen Printing <orders@arkscreenprinting.com>");
  assert.equal(body.reply_to, "alex@arkscreenprinting.com");
  assert.deepEqual(body.to, ["client@rmpc.example", "alex@arkscreenprinting.com"]);
  assert.equal(body.subject, "New RMPC Season Store order ZZZZ1234: 3 garments, $143.53");
  assert.match(body.text, /Delivery: Shipping to Colorado Springs, CO/);
  assert.match(body.text, /2 × RMPC Team Tee, Gildan 5000B Youth Black, size M: \$59\.98/);
  assert.match(body.text, /1 × RMPC Athlete Crewneck, Independent SS3000 Adult Black, size 2XL: \$59\.99/);
  assert.match(body.text, /Shipping & handling: \$14\.00\nSales tax: \$9\.56\nTotal paid: \$143\.53/);
  assert.match(body.html, /Shipping &amp; handling/);
  assert.doesNotMatch(body.text, /1 Main St|\+1719/, "the street address and phone stay in ARK's export");
  assert.match(body.html, /Sam &lt;b&gt;Taylor&lt;\/b&gt;/, "what the buyer typed is escaped");
  assert.doesNotMatch(body.html, /<b>Taylor/);
});

test("pickup orders say so, and older webhook API versions still read", () => {
  const pickup = orderEmail(rmpcSession({ metadata: { ...rmpcSession().metadata, delivery: "pickup" }, collected_information: null }));
  assert.match(pickup.text, /Delivery: Event pickup/);
  const store = orderEmail(rmpcSession({ metadata: { ...rmpcSession().metadata, delivery: "store" }, collected_information: null }));
  assert.match(store.text, /Delivery: Store pickup/);
  const older = orderEmail(rmpcSession({ collected_information: undefined, shipping_details: { name: "Sam Taylor", address: { city: "Denver", state: "CO" } } }));
  assert.match(older.text, /Delivery: Shipping to Denver, CO/);
});

test("other sessions, unpaid sessions and other events send nothing", async () => {
  const resend = fakeResend();
  const handler = createStripeWebhookHandler({ env: ENV, fetchImpl: resend.fetchImpl, now: () => NOW * 1000 });
  for (const payload of [
    eventFor(rmpcSession({ metadata: {} })),
    eventFor(rmpcSession({ payment_status: "unpaid" })),
    eventFor(rmpcSession(), "checkout.session.expired"),
  ]) {
    assert.equal((await deliver(handler, payload)).status, 200);
  }
  assert.equal(resend.calls.length, 0);
  const cleared = await deliver(handler, eventFor(rmpcSession(), "checkout.session.async_payment_succeeded"));
  assert.equal(cleared.status, 200);
  assert.equal(resend.calls.length, 1, "a delayed payment emails once it clears");
});

test("refusals: wrong method, no secret, a bad signature", async () => {
  const resend = fakeResend();
  const handler = createStripeWebhookHandler({ env: ENV, fetchImpl: resend.fetchImpl, now: () => NOW * 1000 });
  const payload = eventFor(rmpcSession());
  assert.equal((await handler(new Request(`${ORIGIN}/api/stripe-webhook`))).status, 405);
  assert.equal((await deliver(handler, payload, sign(payload, { secret: "whsec_other" }))).status, 400);
  const unset = createStripeWebhookHandler({ env: { ...ENV, STRIPE_WEBHOOK_SECRET: "" }, fetchImpl: resend.fetchImpl, now: () => NOW * 1000 });
  assert.equal((await quietly(() => deliver(unset, payload))).status, 503);
  assert.equal(resend.calls.length, 0);
});

test("without the email settings the order is acknowledged and logged, not retried", async () => {
  const resend = fakeResend();
  const handler = createStripeWebhookHandler({ env: { STRIPE_WEBHOOK_SECRET: SECRET }, fetchImpl: resend.fetchImpl, now: () => NOW * 1000 });
  assert.equal((await quietly(() => deliver(handler, eventFor(rmpcSession())))).status, 200);
  assert.equal(resend.calls.length, 0);
});

test("a failed send asks Stripe to retry; a repeat Resend already has is fine", async () => {
  const failing = createStripeWebhookHandler({ env: ENV, fetchImpl: fakeResend(422).fetchImpl, now: () => NOW * 1000 });
  assert.equal((await quietly(() => deliver(failing, eventFor(rmpcSession())))).status, 500);
  const repeat = createStripeWebhookHandler({ env: ENV, fetchImpl: fakeResend(409).fetchImpl, now: () => NOW * 1000 });
  assert.equal((await deliver(repeat, eventFor(rmpcSession()))).status, 200);
});

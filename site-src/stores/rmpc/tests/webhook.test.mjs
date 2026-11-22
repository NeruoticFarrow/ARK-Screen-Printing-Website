import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { createStripeWebhookHandler, emailKey, orderEmail, parseRecipients, recipients, settingsStatus, verifySignature } from "../../../../netlify/functions/stripe-webhook.mjs";
import { encodeItems } from "../catalog.mjs";

const SECRET = "whsec_test_unit";
const NOW = 1_799_000_100;
const ORIGIN = "https://arkscreenprinting.com";
const SESSION_ID = "cs_live_aaaaaaaaaaaaZZZZ1234";

const sign = (payload, { secret = SECRET, t = NOW } = {}) =>
  `t=${t},v1=${crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;

function rmpcSession(overrides = {}) {
  const lines = [
    { productId: "wordmark-tee", variant: "gildan-youth", size: "M", quantity: 2, unitCents: 2999 },
    { productId: "athlete-crew", variant: "independent-adult", size: "2XL", quantity: 1, unitCents: 5999 },
  ];
  return {
    id: SESSION_ID,
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

/** A stand-in for Resend. `answer(call)` picks each reply; by default every send works. */
function fakeResend(answer = () => ({ status: 200 })) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const call = { url: String(url), init, body: JSON.parse(init.body) };
    calls.push(call);
    const { status, body, headers } = answer(call, calls.length);
    const reply = body ?? (status < 300 ? { id: `email_${calls.length}` } : { name: "validation_error", message: "The arkscreenprinting.com domain is not verified." });
    return new Response(JSON.stringify(reply), { status, headers });
  };
  return { calls, fetchImpl };
}

const ENV = { STRIPE_WEBHOOK_SECRET: SECRET, RESEND_API_KEY: "re_test_unit", RMPC_ORDER_NOTIFICATION_EMAIL: "client@rmpc.example, alex@arkscreenprinting.com" };

function handlerWith({ env = ENV, resend = fakeResend(), sleep = async () => {} } = {}) {
  return createStripeWebhookHandler({ env, fetchImpl: resend.fetchImpl, now: () => NOW * 1000, sleep });
}

function deliver(handler, payload, signature = sign(payload)) {
  return handler(new Request(`${ORIGIN}/api/stripe-webhook`, { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": signature }, body: payload }));
}

async function quietly(fn) {
  const { error, warn, log } = console;
  console.error = () => {};
  console.warn = () => {};
  console.log = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, { error, warn, log });
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

test("the notification list also reads semicolons, new lines and names, and counts repeats once", () => {
  assert.deepEqual(recipients("client@rmpc.example; alex@arkscreenprinting.com"), ["client@rmpc.example", "alex@arkscreenprinting.com"]);
  assert.deepEqual(recipients("client@rmpc.example\nAlex <alex@arkscreenprinting.com>"), ["client@rmpc.example", "alex@arkscreenprinting.com"]);
  assert.deepEqual(recipients('"alex@arkscreenprinting.com."'), ["alex@arkscreenprinting.com"], "quotes and a closing full stop aren't part of it");
  assert.deepEqual(recipients("alex@arkscreenprinting.com, Alex@ARKscreenprinting.com"), ["alex@arkscreenprinting.com"]);
  assert.deepEqual(parseRecipients("client@rmpc.example, alex at ark, alex@arkscreenprinting").ignored, ["alex at ark", "alex@arkscreenprinting"], "entries with no full address are kept aside");
  assert.equal(recipients(Array.from({ length: 12 }, (_, i) => `person${i}@rmpc.example`).join(",")).length, 10);
});

test("GET says which settings this deploy has, in counts only", async () => {
  const res = await handlerWith({ env: { ...ENV, RMPC_ORDER_NOTIFICATION_EMAIL: `${ENV.RMPC_ORDER_NOTIFICATION_EMAIL}, alex at ark` } })(new Request(`${ORIGIN}/api/stripe-webhook`));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  const text = await res.text();
  assert.deepEqual(JSON.parse(text), { signingSecret: true, orderEmails: { resendKey: true, addresses: 2, ignoredEntries: 1 } });
  assert.doesNotMatch(text, /@|re_test|whsec/, "no address or key");
  assert.deepEqual(settingsStatus({}), { signingSecret: false, orderEmails: { resendKey: false, addresses: 0, ignoredEntries: 0 } });
});

test("a paid RMPC order emails each address once, through Resend, from ARK's sender", async () => {
  const resend = fakeResend();
  const res = await quietly(() => deliver(handlerWith({ resend }), eventFor(rmpcSession())));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    received: true,
    emailed: 2,
    to: [
      { to: "client@rmpc.example", result: "sent", id: "email_1" },
      { to: "alex@arkscreenprinting.com", result: "sent", id: "email_2" },
    ],
  });
  assert.equal(resend.calls.length, 2, "one email per address");
  assert.deepEqual(resend.calls.map((c) => c.body.to), [["client@rmpc.example"], ["alex@arkscreenprinting.com"]], "nobody sees the other addresses");
  assert.deepEqual(resend.calls.map((c) => c.init.headers["Idempotency-Key"]), [emailKey(SESSION_ID, "client@rmpc.example"), emailKey(SESSION_ID, "alex@arkscreenprinting.com")]);
  const { url, init, body } = resend.calls[0];
  assert.equal(url, "https://api.resend.com/emails");
  assert.equal(init.headers.Authorization, "Bearer re_test_unit");
  assert.equal(body.from, "ARK Screen Printing <orders@arkscreenprinting.com>");
  assert.equal(body.reply_to, "alex@arkscreenprinting.com");
  assert.equal(body.subject, "New RMPC Season Store order ZZZZ1234: 3 garments, $143.53");
  assert.match(body.text, /Delivery: Shipping to Colorado Springs, CO/);
  assert.match(body.text, /2 × RMPC Team Tee, Gildan 5000B Youth Black, size M: \$59\.98/);
  assert.match(body.text, /1 × RMPC Athlete Crewneck, Independent SS3000 Adult Black, size 2XL: \$59\.99/);
  assert.match(body.text, /Shipping & handling: \$14\.00\nSales tax: \$9\.56\nTotal paid: \$143\.53/);
  assert.match(body.html, /Shipping &amp; handling/);
  assert.doesNotMatch(body.text, /1 Main St|\+1719/, "the street address and phone stay in ARK's export");
  assert.match(body.html, /Sam &lt;b&gt;Taylor&lt;\/b&gt;/, "what the buyer typed is escaped");
  assert.doesNotMatch(body.html, /<b>Taylor/);
  assert.equal(resend.calls[1].body.html, body.html, "everyone gets the same email");
});

test("each address keeps its own key for an order, so one added later gets the order on a resend", () => {
  const key = emailKey(SESSION_ID, "alex@arkscreenprinting.com");
  assert.match(key, /^rmpc-store\/order\/cs_live_aaaaaaaaaaaaZZZZ1234\/[0-9a-f]{16}$/);
  assert.equal(emailKey(SESSION_ID, "Alex@ARKscreenprinting.com"), key, "case doesn't matter");
  assert.notEqual(emailKey(SESSION_ID, "client@rmpc.example"), key);
  assert.notEqual(emailKey("cs_live_bbbbbbbbbbbbYYYY5678", "alex@arkscreenprinting.com"), key, "every order is new");
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
  const handler = handlerWith({ resend });
  for (const payload of [
    eventFor(rmpcSession({ metadata: {} })),
    eventFor(rmpcSession({ payment_status: "unpaid" })),
    eventFor(rmpcSession(), "checkout.session.expired"),
  ]) {
    const res = await deliver(handler, payload);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true });
  }
  assert.equal(resend.calls.length, 0);
  const cleared = await quietly(() => deliver(handler, eventFor(rmpcSession(), "checkout.session.async_payment_succeeded")));
  assert.equal(cleared.status, 200);
  assert.equal(resend.calls.length, 2, "a delayed payment emails once it clears");
});

test("refusals: wrong method, no secret, a bad signature", async () => {
  const resend = fakeResend();
  const handler = handlerWith({ resend });
  const payload = eventFor(rmpcSession());
  assert.equal((await handler(new Request(`${ORIGIN}/api/stripe-webhook`, { method: "PUT", body: payload }))).status, 405);
  assert.equal((await deliver(handler, payload, sign(payload, { secret: "whsec_other" }))).status, 400);
  const unset = handlerWith({ env: { ...ENV, STRIPE_WEBHOOK_SECRET: "" }, resend });
  assert.equal((await quietly(() => deliver(unset, payload))).status, 503);
  assert.equal(resend.calls.length, 0);
});

test("without the email settings a paid order is answered 503, so Stripe retries it once they're set", async () => {
  for (const [env, why] of [
    [{ STRIPE_WEBHOOK_SECRET: SECRET, RMPC_ORDER_NOTIFICATION_EMAIL: ENV.RMPC_ORDER_NOTIFICATION_EMAIL }, /RESEND_API_KEY isn't set/],
    [{ ...ENV, RMPC_ORDER_NOTIFICATION_EMAIL: "" }, /RMPC_ORDER_NOTIFICATION_EMAIL has no email address/],
    [{ ...ENV, RMPC_ORDER_NOTIFICATION_EMAIL: "alex at ark" }, /RMPC_ORDER_NOTIFICATION_EMAIL has no email address/],
  ]) {
    const resend = fakeResend();
    const res = await quietly(() => deliver(handlerWith({ env, resend }), eventFor(rmpcSession())));
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, why);
    assert.equal(resend.calls.length, 0);
  }
});

test("one address failing doesn't stop the others, and the order is retried with what Resend said", async () => {
  const resend = fakeResend((call) => (call.body.to[0] === "alex@arkscreenprinting.com" ? { status: 401, body: { name: "validation_error", message: "API key is invalid" } } : { status: 200 }));
  const res = await quietly(() => deliver(handlerWith({ resend }), eventFor(rmpcSession())));
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), {
    error: "1 of 2 order emails failed; Stripe will retry.",
    emailed: 1,
    to: [
      { to: "client@rmpc.example", result: "sent", id: "email_1" },
      { to: "alex@arkscreenprinting.com", result: "failed", error: "Resend answered 401: API key is invalid" },
    ],
  });
  const unreachable = createStripeWebhookHandler({ env: ENV, fetchImpl: async () => { throw new Error("getaddrinfo ENOTFOUND"); }, now: () => NOW * 1000 });
  const down = await quietly(() => deliver(unreachable, eventFor(rmpcSession())));
  assert.equal(down.status, 500);
  assert.match(JSON.stringify(await down.json()), /Resend couldn't be reached: getaddrinfo ENOTFOUND/);
});

test("a repeat Resend already sent is fine; one still being sent is retried", async () => {
  const sent = fakeResend(() => ({ status: 409, body: { name: "invalid_idempotent_request", message: "This idempotency key has already been used on a request that had a different payload." } }));
  const repeat = await quietly(() => deliver(handlerWith({ resend: sent }), eventFor(rmpcSession())));
  assert.equal(repeat.status, 200);
  assert.deepEqual((await repeat.json()).to.map((r) => r.result), ["already sent", "already sent"]);
  const busy = fakeResend(() => ({ status: 409, body: { name: "concurrent_idempotent_requests", message: "Another request with the same idempotency key is in progress." } }));
  assert.equal((await quietly(() => deliver(handlerWith({ resend: busy }), eventFor(rmpcSession())))).status, 500);
});

test("Resend's rate limit waits once, as long as it asks up to a cap, then counts as a failure", async () => {
  const waits = [];
  const sleep = async (ms) => { waits.push(ms); };
  const once = fakeResend((call, n) => (n === 1 ? { status: 429, headers: { "retry-after": "1" }, body: { name: "rate_limit_exceeded", message: "Too many requests." } } : { status: 200 }));
  const res = await quietly(() => deliver(handlerWith({ resend: once, sleep }), eventFor(rmpcSession())));
  assert.equal(res.status, 200);
  assert.deepEqual(waits, [1000]);
  assert.equal(once.calls.length, 3, "the first address twice, then the second");
  assert.equal(once.calls[0].init.headers["Idempotency-Key"], once.calls[1].init.headers["Idempotency-Key"], "the retry is the same email");

  waits.length = 0;
  const always = fakeResend(() => ({ status: 429, headers: { "retry-after": "30" }, body: { name: "rate_limit_exceeded", message: "Too many requests." } }));
  const limited = await quietly(() => deliver(handlerWith({ resend: always, sleep }), eventFor(rmpcSession())));
  assert.equal(limited.status, 500);
  assert.deepEqual(waits, [1500, 1500], "never longer than the cap");
});

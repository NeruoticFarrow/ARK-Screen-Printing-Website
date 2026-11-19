import assert from "node:assert/strict";
import test from "node:test";
import { CONTACT, createDashboardHandler } from "../../../netlify/functions/dashboard-api.mjs";
import { SHOP } from "../../lib/facts.mjs";
import { memoryStorage } from "../../../netlify/lib/dashboard/storage.mjs";
import { SHEET_DOLLARS, fakeRandom, fakeStripe, session } from "./fixtures.mjs";

const ORIGIN = "https://arkscreenprinting.com";
const ADMIN = "alex@arkscreenprinting.com";
const CLIENT = "coach@rmpc.example";
const T0 = Date.parse("2026-12-01T17:00:00Z");
const ENV = { DASHBOARD_ADMIN_EMAILS: ADMIN, RESEND_API_KEY: "re_test", STRIPE_SECRET_KEY: "sk_test_unit", RMPC_ORDER_NOTIFICATION_EMAIL: "Coach@RMPC.example, orders@rmpc.example" };

const SESSIONS = [
  session({ lines: [["athlete-tee", "gildan-adult", "L", 2, 2999]], name: "Jordan Lee", email: "jordan@example.com", delivery: "pickup" }),
  session({ lines: [["wordmark-crew", "independent-youth", "M", 1, 5999]], name: "Riley Park", email: "riley@example.com", delivery: "ship", city: "Pueblo", state: "CO", tax: 400 }),
  session({ lines: [["wordmark-tee", "gildan-adult", "S", 1, 2999]], channel: "ark-designer" }),
];

function setup({ env = ENV, sessions = SESSIONS, stripeStatus = 200, clients = [CLIENT] } = {}) {
  const storage = memoryStorage(clients ? { "access/rmpc": { emails: clients, updatedAt: T0, updatedBy: ADMIN } } : {});
  const sent = [];
  let clockMs = T0;
  const stripe = fakeStripe(sessions, { status: stripeStatus });
  const handler = createDashboardHandler({ env, fetchImpl: stripe.fetchImpl, storage, now: () => clockMs, random: fakeRandom(), send: async (m) => sent.push(m) });
  const call = (method, path, { body, cookie, headers = {} } = {}) => handler(new Request(`${ORIGIN}/api/dashboard/${path}`, {
    method,
    headers: { ...(body !== undefined ? { "Content-Type": "application/json", Origin: ORIGIN } : {}), ...(method === "DELETE" ? { Origin: ORIGIN } : {}), ...(cookie ? { cookie } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  }), { deploy: { context: "production" } });
  const signIn = async (email) => {
    const before = sent.length;
    const asked = await call("POST", "sign-in", { body: { email } });
    assert.equal(asked.status, 200);
    assert.equal(sent.length, before + 1, `a code went to ${email}`);
    const res = await call("POST", "verify", { body: { email, code: sent.at(-1).code } });
    assert.equal(res.status, 200, await res.clone().text());
    clockMs += 31_000;
    return res.headers.get("set-cookie").split(";")[0];
  };
  return { storage, sent, stripe, call, signIn, tick: (ms) => { clockMs += ms; } };
}

test("a client signs in with the emailed code and sees only their store's data", async () => {
  const t = setup();
  const cookie = await t.signIn(CLIENT);
  assert.match(cookie, /^__Host-ark_dashboard=[A-Za-z0-9_-]{43}$/);

  const me = await (await t.call("GET", "me", { cookie })).json();
  assert.deepEqual(me.stores, [{ id: "rmpc", name: "RMPC Season Store", client: "Rocky Mountain Parkour Championships" }]);
  assert.equal(me.admin, false);
  assert.equal(me.email, CLIENT);

  const res = await t.call("GET", "stores/rmpc", { cookie });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
  const data = await res.json();
  assert.equal(data.orders.length, 2, "only this store's Stripe sessions");
  assert.deepEqual(data.orders.map((o) => o.buyer.name), ["Riley Park", "Jordan Lee"], "newest first");
  assert.deepEqual(data.totals.byDelivery, { event: 1, store: 0, ship: 1 });
  assert.equal(data.totals.salesCents, 2 * 2999 + 5999);
  assert.equal(data.profit.ready, false, "no cost sheet yet");
  assert.deepEqual(data.profit.groups.map((g) => g.garments), [2, 1]);
  assert.deepEqual(data.payments, { list: [], paidCents: 0, owedCents: 0 });
  assert.equal(data.admin, undefined, "a client isn't sent ARK's export link");
  assert.deepEqual(data.printCounts.map((c) => [c.product, c.size, c.quantity]), [["RMPC Athlete Tee", "L", 2], ["RMPC Team Crewneck", "M", 1]], "in catalogue order");
  assert.doesNotMatch(JSON.stringify(data), /Secret Street|81003|5550100/, "no street address or phone");
  assert.equal(t.stripe.calls.length, 1);
  assert.match(t.stripe.calls[0].url, /\/v1\/checkout\/sessions\?/);
});

test("a client can't open the ARK page or change anything", async () => {
  const t = setup();
  const cookie = await t.signIn(CLIENT);
  assert.equal((await t.call("GET", "admin", { cookie })).status, 403);
  assert.equal((await t.call("PUT", "admin/stores/rmpc/costs", { cookie, body: { sheet: SHEET_DOLLARS } })).status, 403);
  assert.equal((await t.call("PUT", "admin/stores/rmpc/clients", { cookie, body: { emails: ["me@example.com"] } })).status, 403);
  assert.equal((await t.call("POST", "admin/stores/rmpc/payments", { cookie, body: { date: "2026-12-01", amount: "1.00" } })).status, 403);
  assert.equal(await t.storage.get("costs/rmpc"), null);
  assert.equal((await t.call("GET", "stores/other", { cookie })).status, 404);
});

test("an address that isn't on a list gets the same answer and no email", async () => {
  const t = setup();
  const res = await t.call("POST", "sign-in", { body: { email: "stranger@example.com" } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(t.sent.length, 0);
  const verify = await t.call("POST", "verify", { body: { email: "stranger@example.com", code: "123456" } });
  assert.equal(verify.status, 401);
  assert.equal((await t.call("POST", "sign-in", { body: { email: "not-an-address" } })).status, 400);
});

test("the emailed link signs in too", async () => {
  const t = setup();
  await t.call("POST", "sign-in", { body: { email: CLIENT } });
  const token = new URL(t.sent[0].link).searchParams.get("signin");
  assert.equal(new URL(t.sent[0].link).origin, ORIGIN);
  const res = await t.call("POST", "verify", { body: { token } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=Lax/);
});

test("taking a client off the list locks them out at once", async () => {
  const t = setup();
  const cookie = await t.signIn(CLIENT);
  const admin = await t.signIn(ADMIN);
  const saved = await t.call("PUT", "admin/stores/rmpc/clients", { cookie: admin, body: { emails: ["someone-else@example.com"] } });
  assert.equal(saved.status, 200);
  assert.equal((await t.call("GET", "stores/rmpc", { cookie })).status, 404);
  assert.deepEqual((await (await t.call("GET", "me", { cookie })).json()).stores, []);
});

test("signing out ends the session", async () => {
  const t = setup();
  const cookie = await t.signIn(CLIENT);
  const out = await t.call("POST", "sign-out", { cookie, body: {} });
  assert.equal(out.status, 200);
  assert.match(out.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await t.call("GET", "me", { cookie })).status, 401);
  assert.equal((await t.call("GET", "me")).status, 401);
});

test("changes must come from the dashboard page itself", async () => {
  const t = setup();
  const admin = await t.signIn(ADMIN);
  const crossSite = await t.call("PUT", "admin/stores/rmpc/clients", { cookie: admin, body: { emails: ["evil@example.com"] }, headers: { Origin: "https://evil.example" } });
  assert.equal(crossSite.status, 403);
  const form = await t.call("POST", "sign-in", { body: "email=x@example.com", headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  assert.equal(form.status, 403, "a cross-site form can't post");
  const fetchMetadata = await t.call("POST", "sign-out", { cookie: admin, body: {}, headers: { Origin: "", "Sec-Fetch-Site": "cross-site" } });
  assert.equal(fetchMetadata.status, 403);
  assert.deepEqual((await t.storage.get("access/rmpc")).emails, [CLIENT]);
  assert.equal((await t.call("GET", "nope")).status, 404);
  const wrongMethod = await t.call("GET", "sign-in");
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get("allow"), "POST");
});

test("ARK signs in without being on a list and keeps the lists, costs and payments", async () => {
  const t = setup({ clients: null });
  const admin = await t.signIn(ADMIN);
  const me = await (await t.call("GET", "me", { cookie: admin })).json();
  assert.equal(me.admin, true);

  let page = await (await t.call("GET", "admin", { cookie: admin })).json();
  const rmpc = page.stores[0];
  assert.equal(rmpc.clients, null);
  assert.deepEqual(rmpc.suggested, ["coach@rmpc.example", "orders@rmpc.example"], "the order-email addresses are offered");
  assert.deepEqual(rmpc.costing.tiers, [25, 50, 100]);
  assert.deepEqual(rmpc.costing.groups.map((g) => g.id), ["athlete", "wordmark"]);
  assert.equal(rmpc.costing.blanks.find((b) => b.id === "gildan-adult").upcharge, true);
  assert.equal(rmpc.costing.blanks.find((b) => b.id === "gildan-youth").upcharge, false);
  assert.equal(rmpc.costs, null);

  const bad = await t.call("PUT", "admin/stores/rmpc/clients", { cookie: admin, body: { emails: ["ok@example.com", "nope"] } });
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error, /nope/);
  const clients = await (await t.call("PUT", "admin/stores/rmpc/clients", { cookie: admin, body: { emails: "Coach@RMPC.example\norders@rmpc.example" } })).json();
  assert.deepEqual(clients.clients.emails, ["coach@rmpc.example", "orders@rmpc.example"]);

  const badSheet = await t.call("PUT", "admin/stores/rmpc/costs", { cookie: admin, body: { sheet: { athlete: { "gildan-adult": { 25: "lots" } } } } });
  assert.equal(badSheet.status, 400);
  const costs = await (await t.call("PUT", "admin/stores/rmpc/costs", { cookie: admin, body: { sheet: SHEET_DOLLARS } })).json();
  assert.deepEqual(costs.costs.sheet.wordmark["gildan-adult"], { 25: "16.00", 50: "12.00", 100: "8.00", upcharge: "2.00" });
  assert.equal(costs.costs.updatedBy, ADMIN);

  assert.equal((await t.call("POST", "admin/stores/rmpc/payments", { cookie: admin, body: { date: "2026-12-01", amount: "0" } })).status, 400);
  assert.equal((await t.call("POST", "admin/stores/rmpc/payments", { cookie: admin, body: { date: "Dec 1", amount: "5.00" } })).status, 400);
  const paid = await (await t.call("POST", "admin/stores/rmpc/payments", { cookie: admin, body: { date: "2026-12-05", amount: "$10.50", method: "Check", note: "First payout" } })).json();
  assert.equal(paid.payments.length, 1);
  assert.deepEqual({ ...paid.payments[0], id: "x" }, { id: "x", date: "2026-12-05", amountCents: 1050, method: "Check", note: "First payout", recordedAt: T0 + 31_000, recordedBy: ADMIN });

  // The client's view now has profit and the payment.
  const client = await t.signIn("coach@rmpc.example");
  const data = await (await t.call("GET", "stores/rmpc", { cookie: client })).json();
  assert.equal(data.profit.ready, true);
  assert.equal(data.profit.complete, true);
  const cost = 2 * 2000 + 3100; // athlete Gildan adult L and wordmark Independent youth M, both at the 25-piece price
  assert.equal(data.profit.totals.costCents, cost);
  assert.equal(data.profit.totals.profitCents, 2 * 2999 + 5999 - cost);
  assert.equal(data.payments.paidCents, 1050);
  assert.equal(data.payments.owedCents, 2 * 2999 + 5999 - cost - 1050);
  assert.equal(data.profit.final, false, "RMPC is still taking orders");

  page = await (await t.call("GET", "admin", { cookie: admin })).json();
  const id = page.stores[0].payments[0].id;
  assert.equal((await t.call("DELETE", `admin/stores/rmpc/payments/${id}`, { cookie: admin })).status, 200);
  assert.equal((await t.call("DELETE", `admin/stores/rmpc/payments/${id}`, { cookie: admin })).status, 404);
  assert.deepEqual((await t.storage.get("payments/rmpc")).list, []);
  const adminView = await (await t.call("GET", "stores/rmpc", { cookie: admin })).json();
  assert.deepEqual(adminView.admin, { exportPath: "/api/rmpc/orders" });
});

test("the spreadsheets download for a signed-in client", async () => {
  const t = setup();
  const cookie = await t.signIn(CLIENT);
  const orders = await t.call("GET", "stores/rmpc/orders.csv", { cookie });
  assert.equal(orders.status, 200);
  assert.equal(orders.headers.get("content-type"), "text/csv; charset=utf-8");
  assert.equal(orders.headers.get("content-disposition"), 'attachment; filename="rmpc-orders-2026-12-01.csv"');
  const text = await orders.text();
  assert.equal(text.trim().split("\r\n").length, 3);
  assert.doesNotMatch(text, /Phone|Secret Street|5550100/);
  const counts = await t.call("GET", "stores/rmpc/print-counts.csv", { cookie });
  assert.match(await counts.text(), /Total,,,,,,3\r\n$/);
  assert.equal((await t.call("GET", "stores/rmpc/orders.csv")).status, 401);
});

test("missing settings answer plainly", async () => {
  const noMail = setup({ env: { ...ENV, RESEND_API_KEY: "" } });
  const res = await noMail.call("POST", "sign-in", { body: { email: CLIENT } });
  assert.equal(res.status, 503);
  assert.equal(noMail.sent.length, 0);

  const noStripe = setup({ env: { ...ENV, STRIPE_SECRET_KEY: "" } });
  const cookie = await noStripe.signIn(CLIENT);
  const store = await noStripe.call("GET", "stores/rmpc", { cookie });
  assert.equal(store.status, 503);
  assert.doesNotMatch((await store.json()).error, /STRIPE/, "a client isn't told about settings");

  const stripeDown = setup({ stripeStatus: 401 });
  const c2 = await stripeDown.signIn(CLIENT);
  assert.equal((await stripeDown.call("GET", "stores/rmpc", { cookie: c2 })).status, 502);
});

test("the dashboard gives ARK's line and email as the site does", () => {
  assert.deepEqual(CONTACT, { phoneDisplay: SHOP.phoneDisplay, phoneHref: SHOP.phoneHref, email: SHOP.email });
});

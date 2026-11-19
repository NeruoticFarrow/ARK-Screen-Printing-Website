import assert from "node:assert/strict";
import test from "node:test";
import { COOKIE, clearedCookie, endSession, normaliseEmail, requestCode, sessionCookie, sessionEmail, signInEmail, startSession, verifyCode, verifyLink } from "../../../netlify/lib/dashboard/auth.mjs";
import { accessFor, emailList, saveClientList } from "../../../netlify/lib/dashboard/access.mjs";
import { memoryStorage, storeName } from "../../../netlify/lib/dashboard/storage.mjs";
import { fakeRandom } from "./fixtures.mjs";

const T0 = Date.parse("2026-12-01T17:00:00Z");
const ORIGIN = "https://arkscreenprinting.com";
const MINUTE = 60_000;

function setup({ members = ["client@example.com"] } = {}) {
  const storage = memoryStorage();
  const sent = [];
  const ask = (email, now = T0, random = fakeRandom()) => requestCode({ email, storage, canSignIn: async (e) => members.includes(e), send: async (m) => sent.push(m), origin: ORIGIN, now, random });
  return { storage, sent, ask };
}

const withCookie = (token) => new Request(`${ORIGIN}/api/dashboard/me`, { headers: { cookie: `other=1; ${COOKIE}=${token}` } });

test("addresses are trimmed and lowercased; anything else isn't one", () => {
  assert.equal(normaliseEmail("  Client@Example.COM "), "client@example.com");
  assert.equal(normaliseEmail("not an email"), null);
  assert.equal(normaliseEmail("a@b"), null);
  assert.equal(normaliseEmail("a,b@example.com"), null);
  assert.equal(normaliseEmail(`${"x".repeat(250)}@example.com`), null);
  assert.equal(normaliseEmail(42), null);
  assert.deepEqual(emailList("A@x.com, b@x.com;\nA@x.com junk"), ["a@x.com", "b@x.com"]);
});

test("a client gets a code and a link; storage keeps only hashes", async () => {
  const { storage, sent, ask } = setup();
  assert.deepEqual(await ask("Client@Example.com"), { ok: true });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].email, "client@example.com");
  assert.equal(sent[0].code, "123456");
  assert.match(sent[0].link, /^https:\/\/arkscreenprinting\.com\/dashboard\?signin=[A-Za-z0-9_-]{43}$/);
  const token = new URL(sent[0].link).searchParams.get("signin");
  const stored = JSON.stringify([...storage.map.entries()]);
  assert.doesNotMatch(stored, /123456/);
  assert.ok(!stored.includes(token), "the link's token isn't stored");
  assert.ok([...storage.map.keys()].every((k) => /^(code|link)\/[0-9a-f]{64}$/.test(k)), "keys are hashes, not the address or token");
});

test("anyone else gets the same answer and no email, and the same limits", async () => {
  const { sent, ask } = setup();
  assert.deepEqual(await ask("stranger@example.com"), { ok: true });
  assert.equal(sent.length, 0);
  const again = await ask("stranger@example.com", T0 + 5_000);
  const member = setup();
  await member.ask("client@example.com");
  const memberAgain = await member.ask("client@example.com", T0 + 5_000);
  assert.deepEqual(again, memberAgain, "a second ask inside 30 seconds answers the same for both");
  assert.equal(again.status, 429);
});

test("at most 5 codes an hour for one address", async () => {
  const { ask, sent } = setup();
  for (let i = 0; i < 5; i++) assert.deepEqual(await ask("client@example.com", T0 + i * MINUTE), { ok: true });
  const sixth = await ask("client@example.com", T0 + 5 * MINUTE);
  assert.equal(sixth.status, 429);
  assert.match(sixth.error, /hour/);
  assert.equal(sent.length, 5);
  assert.deepEqual(await ask("client@example.com", T0 + 61 * MINUTE), { ok: true }, "an hour on, codes flow again");
});

test("a code signs in once, within 15 minutes, and only the newest one counts", async () => {
  const { storage, ask, sent } = setup();
  await ask("client@example.com", T0, fakeRandom(111111));
  await ask("client@example.com", T0 + MINUTE, fakeRandom(222222));
  const old = await verifyCode({ email: "client@example.com", code: "111111", storage, now: T0 + 2 * MINUTE });
  assert.equal(old.ok, false);
  assert.equal(old.status, 401);
  assert.deepEqual(await verifyCode({ email: " CLIENT@example.com", code: "222 222", storage, now: T0 + 2 * MINUTE }), { ok: true, email: "client@example.com" });
  const reused = await verifyCode({ email: "client@example.com", code: "222222", storage, now: T0 + 3 * MINUTE });
  assert.equal(reused.ok, false, "a spent code can't sign in twice");
  const link = new URL(sent[1].link).searchParams.get("signin");
  assert.equal((await verifyLink({ token: link, storage, now: T0 + 3 * MINUTE })).ok, false, "using the code spends the link too");

  await ask("client@example.com", T0 + 4 * MINUTE, fakeRandom(333333));
  const late = await verifyCode({ email: "client@example.com", code: "333333", storage, now: T0 + 4 * MINUTE + 15 * MINUTE });
  assert.match(late.error, /expired/);
});

test("five wrong codes lock that code", async () => {
  const { storage, ask } = setup();
  await ask("client@example.com");
  for (let i = 0; i < 5; i++) {
    const wrong = await verifyCode({ email: "client@example.com", code: "000000", storage, now: T0 + 1_000 });
    assert.match(wrong.error, /isn't right/);
  }
  const right = await verifyCode({ email: "client@example.com", code: "123456", storage, now: T0 + 2_000 });
  assert.equal(right.ok, false);
  assert.match(right.error, /Too many/);
  assert.equal((await verifyCode({ email: "client@example.com", code: "12345", storage, now: T0 })).status, 400);
});

test("the emailed link signs in once and spends the code", async () => {
  const { storage, ask, sent } = setup();
  await ask("client@example.com");
  const token = new URL(sent[0].link).searchParams.get("signin");
  assert.deepEqual(await verifyLink({ token, storage, now: T0 + MINUTE }), { ok: true, email: "client@example.com" });
  assert.equal((await verifyLink({ token, storage, now: T0 + MINUTE })).ok, false);
  assert.equal((await verifyCode({ email: "client@example.com", code: "123456", storage, now: T0 + MINUTE })).ok, false);
  assert.equal((await verifyLink({ token: "short", storage })).status, 400);
  await ask("client@example.com", T0 + MINUTE);
  const late = new URL(sent[1].link).searchParams.get("signin");
  assert.match((await verifyLink({ token: late, storage, now: T0 + 17 * MINUTE })).error, /expired/);
});

test("sessions last 30 days, live in storage, and end on sign-out", async () => {
  const storage = memoryStorage();
  const token = await startSession({ email: "client@example.com", storage, now: T0, random: fakeRandom() });
  assert.equal(await sessionEmail({ req: withCookie(token), storage, now: T0 + 29 * 86_400_000 }), "client@example.com");
  assert.equal(await sessionEmail({ req: withCookie("forged-token-forged-token"), storage, now: T0 }), null);
  assert.equal(await sessionEmail({ req: new Request(ORIGIN), storage, now: T0 }), null);
  assert.equal(await sessionEmail({ req: withCookie(token), storage, now: T0 + 30 * 86_400_000 }), null);
  assert.equal(storage.map.size, 0, "an expired session is deleted");

  const second = await startSession({ email: "client@example.com", storage, now: T0, random: fakeRandom() });
  await endSession({ req: withCookie(second), storage });
  assert.equal(await sessionEmail({ req: withCookie(second), storage, now: T0 }), null);
  assert.doesNotMatch(JSON.stringify([...storage.map.keys()]), new RegExp(second));
});

test("the cookie is host-only, HttpOnly, Secure and Lax", () => {
  assert.equal(sessionCookie("abc"), "__Host-ark_dashboard=abc; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax");
  assert.match(clearedCookie(), /^__Host-ark_dashboard=; Path=\/; Max-Age=0;/);
});

test("the sign-in email puts the code in the subject and escapes what it shows", () => {
  const mail = signInEmail({ code: "123456", link: "https://arkscreenprinting.com/dashboard?signin=abc&x=<b>", contact: { phoneDisplay: "(719) 280-2638" } });
  assert.equal(mail.subject, "123456 is your ARK store dashboard code");
  assert.match(mail.text, /123456/);
  assert.match(mail.text, /15 minutes/);
  assert.match(mail.html, /signin=abc&amp;x=&lt;b&gt;/);
  assert.match(mail.html, /\(719\) 280-2638/);
});

test("access: ARK sees every store; a client sees the stores whose list has them", async () => {
  const storage = memoryStorage();
  const env = { DASHBOARD_ADMIN_EMAILS: "Alex@ArkScreenPrinting.com, help@arkscreenprinting.com" };
  assert.deepEqual((await accessFor("alex@arkscreenprinting.com", { env, storage })).stores.map((s) => s.id), ["rmpc"]);
  assert.equal((await accessFor("alex@arkscreenprinting.com", { env, storage })).admin, true);
  assert.deepEqual(await accessFor("client@example.com", { env, storage }), { admin: false, stores: [] });
  await saveClientList(storage, "rmpc", ["Client@Example.com", "client@example.com"], { by: "alex@arkscreenprinting.com", now: T0 });
  assert.deepEqual(await storage.get("access/rmpc"), { emails: ["client@example.com"], updatedAt: T0, updatedBy: "alex@arkscreenprinting.com" });
  assert.deepEqual((await accessFor("client@example.com", { env, storage })).stores.map((s) => s.id), ["rmpc"]);
  assert.deepEqual(await accessFor(null, { env, storage }), { admin: false, stores: [] });
});

test("each deploy context gets its own storage", () => {
  assert.equal(storeName("production"), "client-dashboard");
  assert.equal(storeName("deploy-preview"), "client-dashboard-deploy-preview");
  assert.equal(storeName("branch-deploy"), "client-dashboard-branch-deploy");
  assert.equal(storeName(undefined), "client-dashboard-dev");
});

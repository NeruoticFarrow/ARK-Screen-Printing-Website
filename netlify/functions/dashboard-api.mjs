// /api/dashboard/… — the client dashboard's server (the page is
// ark-site-review/dashboard.html, from site-src/dashboard/). Each made-for-you
// store's client signs in with their email and sees that store's orders, print
// counts and profit; ARK's people see every store and keep the lists, cost
// sheets and payments.
//
//   POST   sign-in                        { email }: emails a code and a link
//   POST   verify                         { email, code } or { token }: starts a session (cookie)
//   POST   sign-out
//   GET    me                             who's signed in and which stores they see
//   GET    stores/<id>                    orders, totals, print counts, profit, payments
//   GET    stores/<id>/orders.csv
//   GET    stores/<id>/print-counts.csv
//   GET    admin                          ARK: every store's client list, cost sheet, payments
//   PUT    admin/stores/<id>/clients      ARK: { emails }
//   PUT    admin/stores/<id>/costs        ARK: { sheet } in dollars
//   POST   admin/stores/<id>/payments     ARK: { date, amount, method, note }
//   DELETE admin/stores/<id>/payments/<payment id>
//
// Orders are read from Stripe on every request (no database), the way the
// RMPC export reads them. Everything else is in Netlify Blobs (storage.mjs).
//
// Environment (Netlify → Site configuration → Environment variables):
//   DASHBOARD_ADMIN_EMAILS  ARK's addresses, comma-separated. They see every store.
//   RESEND_API_KEY          sends the sign-in emails (the order emails use it too).
//   STRIPE_SECRET_KEY       reads the orders (the checkout uses it too).

import crypto from "node:crypto";
import { accessFor, canSignIn, clientList, emailList, saveClientList } from "../lib/dashboard/access.mjs";
import { clearedCookie, endSession, requestCode, sessionCookie, sessionEmail, signInEmail, startSession, verifyCode, verifyLink } from "../lib/dashboard/auth.mjs";
import { clientOrder, clientOrdersCsv, costSheetInDollars, parseCostSheet, paymentsSummary, printCountsCsv, profitReport, toCents, totals } from "../lib/dashboard/report.mjs";
import { blobStorage } from "../lib/dashboard/storage.mjs";
import { STORES, storeById } from "../lib/dashboard/stores.mjs";
import { sendEmail } from "../lib/resend.mjs";

export const config = { path: "/api/dashboard/*" };

/** ARK's line and email, as the site shows them (SHOP in
 *  site-src/lib/facts.mjs; a test keeps the two equal). Not imported from
 *  there, because facts.mjs reads the site build's cache files. */
export const CONTACT = { phoneDisplay: "(719) 280-2638", phoneHref: "tel:+17192802638", email: "alex@arkscreenprinting.com" };

const MAX_BODY_CHARS = 20_000;
const MAX_PAYMENTS = 200;
const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...HEADERS, ...headers } });
const fail = (status, error, headers) => json(status, { error }, headers);

const ROUTES = [
  ["POST", /^sign-in$/, "signIn"],
  ["POST", /^verify$/, "verify"],
  ["POST", /^sign-out$/, "signOut"],
  ["GET", /^me$/, "me"],
  ["GET", /^stores\/([a-z0-9-]{1,40})$/, "store"],
  ["GET", /^stores\/([a-z0-9-]{1,40})\/orders\.csv$/, "ordersCsv"],
  ["GET", /^stores\/([a-z0-9-]{1,40})\/print-counts\.csv$/, "printCsv"],
  ["GET", /^admin$/, "admin"],
  ["PUT", /^admin\/stores\/([a-z0-9-]{1,40})\/clients$/, "saveClients"],
  ["PUT", /^admin\/stores\/([a-z0-9-]{1,40})\/costs$/, "saveCosts"],
  ["POST", /^admin\/stores\/([a-z0-9-]{1,40})\/payments$/, "addPayment"],
  ["DELETE", /^admin\/stores\/([a-z0-9-]{1,40})\/payments\/([A-Za-z0-9_-]{1,40})$/, "removePayment"],
];

const DENVER = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" });
function denverDay(ms) {
  const p = Object.fromEntries(DENVER.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** A change may only come from this site's own pages: a JSON body (which a
 *  cross-site form can't send) and, when the browser names one, our Origin. */
function sameSite(req, url) {
  const origin = req.headers.get("origin");
  if (origin && origin !== url.origin) return false;
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  if (req.method === "DELETE") return Boolean(origin) || req.headers.get("sec-fetch-site") === "same-origin";
  return (req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json");
}

async function readBody(req) {
  const text = await req.text();
  if (text.length > MAX_BODY_CHARS) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export function createDashboardHandler({ env = process.env, fetchImpl = fetch, storage: injected, now = () => Date.now(), random = crypto, send } = {}) {
  const sendSignIn = send ?? (async ({ email, code, link }) => {
    const { subject, html, text } = signInEmail({ code, link, contact: CONTACT });
    await sendEmail({ apiKey: env.RESEND_API_KEY, to: email, replyTo: CONTACT.email, subject, html, text, fetchImpl });
  });

  async function loadStore(store, access) {
    const secretKey = env.STRIPE_SECRET_KEY;
    if (!secretKey) return { error: fail(503, access.admin ? "Set STRIPE_SECRET_KEY in Netlify to read the orders." : "Orders aren't connected yet. Please check back soon.") };
    let raw;
    try {
      raw = await store.loadOrders(secretKey, fetchImpl);
    } catch (err) {
      console.error(`[dashboard] Stripe refused ${store.id}'s orders: ${err?.message ?? err}`);
      return { error: fail(502, "Stripe didn't answer. Try again in a minute.") };
    }
    // Newest first, as the pages list them.
    return { orders: raw.map((o) => clientOrder(store, o)).sort((a, b) => b.created - a.created) };
  }

  const handlers = {
    async signIn({ req, url, storage }) {
      const body = await readBody(req);
      if (!body) return fail(400, "Enter your email address.");
      if (!env.RESEND_API_KEY) {
        console.error("[dashboard] RESEND_API_KEY isn't set, so no sign-in email can go out");
        return fail(503, "Sign-in isn't switched on yet. Please call or email ARK.");
      }
      try {
        const result = await requestCode({ email: body.email, storage, canSignIn: (email) => canSignIn(email, { env, storage }), send: sendSignIn, origin: url.origin, now: now(), random });
        return result.ok ? json(200, { ok: true }) : fail(result.status, result.error);
      } catch (err) {
        console.error(`[dashboard] the sign-in email failed: ${err?.message ?? err}`);
        return fail(502, "The email didn't go out. Try again in a minute.");
      }
    },

    async verify({ req, storage }) {
      const body = await readBody(req);
      if (!body) return fail(400, "Enter the 6-digit code from the email.");
      const result = body.token !== undefined
        ? await verifyLink({ token: body.token, storage, now: now() })
        : await verifyCode({ email: body.email, code: body.code, storage, now: now() });
      if (!result.ok) return fail(result.status, result.error);
      const access = await accessFor(result.email, { env, storage });
      if (!access.stores.length) return fail(403, "That address can't see a store any more. Ask ARK to add it.");
      const token = await startSession({ email: result.email, storage, now: now(), random });
      return json(200, { ok: true }, { "Set-Cookie": sessionCookie(token) });
    },

    async signOut({ req, storage }) {
      await endSession({ req, storage });
      return json(200, { ok: true }, { "Set-Cookie": clearedCookie() });
    },

    async me({ email, access }) {
      return json(200, { email, admin: access.admin, stores: access.stores.map((s) => ({ id: s.id, name: s.name, client: s.client })), contact: { phone: CONTACT.phoneDisplay, phoneHref: CONTACT.phoneHref, email: CONTACT.email } });
    },

    async store({ store, access, storage }) {
      const { orders, error } = await loadStore(store, access);
      if (error) return error;
      const [sheet, payments] = await Promise.all([storage.get(`costs/${store.id}`), storage.get(`payments/${store.id}`)]);
      const closed = store.isClosed(now());
      const profit = profitReport(store, orders, sheet);
      return json(200, {
        store: { id: store.id, name: store.name, client: store.client, path: store.path, closesAt: store.closesAt(), closed },
        asOf: new Date(now()).toISOString(),
        totals: totals(orders),
        orders,
        printCounts: store.printCounts(orders),
        profit: { ...profit, final: closed, tiers: store.costing.tiers, upchargeSizes: store.costing.upchargeSizes },
        // Nothing is owed until there's a cost sheet to work profit out from.
        payments: paymentsSummary(payments?.list, profit.ready ? profit.totals.profitCents : 0),
        ...(access.admin ? { admin: { exportPath: store.exportPath } } : {}),
      });
    },

    async ordersCsv({ store, access }) {
      const { orders, error } = await loadStore(store, access);
      if (error) return error;
      return new Response(clientOrdersCsv(orders), { status: 200, headers: { ...HEADERS, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${store.id}-orders-${denverDay(now())}.csv"` } });
    },

    async printCsv({ store, access }) {
      const { orders, error } = await loadStore(store, access);
      if (error) return error;
      return new Response(printCountsCsv(store.printCounts(orders)), { status: 200, headers: { ...HEADERS, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${store.id}-print-counts-${denverDay(now())}.csv"` } });
    },

    async admin({ storage }) {
      const stores = [];
      for (const s of STORES) {
        const [clients, sheet, payments] = await Promise.all([clientList(storage, s.id), storage.get(`costs/${s.id}`), storage.get(`payments/${s.id}`)]);
        stores.push({
          id: s.id,
          name: s.name,
          client: s.client,
          path: s.path,
          exportPath: s.exportPath,
          clients,
          suggested: emailList(env[s.notifyEnv]),
          costing: { groups: s.costing.groups.map(({ id, label, note }) => ({ id, label, note })), blanks: s.costing.blanks.map(({ id, label, upcharge }) => ({ id, label, upcharge })), tiers: s.costing.tiers, upchargeSizes: s.costing.upchargeSizes },
          costs: sheet ? { sheet: costSheetInDollars(s.costing, sheet), updatedAt: sheet.updatedAt, updatedBy: sheet.updatedBy } : null,
          payments: paymentsSummary(payments?.list, 0).list,
        });
      }
      return json(200, { stores });
    },

    async saveClients({ req, store, email, storage }) {
      const body = await readBody(req);
      const typed = Array.isArray(body?.emails) ? body.emails : String(body?.emails ?? "").split(/[\s,;]+/).filter(Boolean);
      const bad = typed.filter((e) => !emailList([e]).length);
      if (bad.length) return fail(400, `Not an email address: ${String(bad[0]).slice(0, 80)}`);
      return json(200, { clients: await saveClientList(storage, store.id, typed, { by: email, now: now() }) });
    },

    async saveCosts({ req, store, email, storage }) {
      const body = await readBody(req);
      const parsed = parseCostSheet(store.costing, body?.sheet);
      if (!parsed.ok) return fail(400, parsed.error);
      const record = { ...parsed.sheet, updatedAt: now(), updatedBy: email };
      await storage.set(`costs/${store.id}`, record);
      return json(200, { costs: { sheet: costSheetInDollars(store.costing, record), updatedAt: record.updatedAt, updatedBy: email } });
    },

    async addPayment({ req, store, email, storage }) {
      const body = await readBody(req);
      const amountCents = toCents(body?.amount);
      if (!Number.isInteger(amountCents) || amountCents <= 0) return fail(400, "Enter the amount paid, like 250.00.");
      const date = String(body?.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) return fail(400, "Enter the date it was paid.");
      const method = String(body?.method ?? "").trim().slice(0, 40);
      const note = String(body?.note ?? "").trim().slice(0, 200);
      const record = (await storage.get(`payments/${store.id}`)) ?? { list: [] };
      if (record.list.length >= MAX_PAYMENTS) return fail(400, "This store has too many payments recorded.");
      const payment = { id: random.randomBytes(9).toString("base64url"), date, amountCents, method, note, recordedAt: now(), recordedBy: email };
      const next = { list: [...record.list, payment] };
      await storage.set(`payments/${store.id}`, next);
      return json(200, { payments: paymentsSummary(next.list, 0).list });
    },

    async removePayment({ store, params, storage }) {
      const record = (await storage.get(`payments/${store.id}`)) ?? { list: [] };
      const next = { list: record.list.filter((p) => p.id !== params[2]) };
      if (next.list.length === record.list.length) return fail(404, "That payment isn't recorded.");
      await storage.set(`payments/${store.id}`, next);
      return json(200, { payments: paymentsSummary(next.list, 0).list });
    },
  };

  const OPEN = new Set(["signIn", "verify", "signOut"]);

  return async function handler(req, context) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/dashboard\/?/, "").replace(/\/$/, "");
    const matches = ROUTES.filter(([, pattern]) => pattern.test(path));
    if (!matches.length) return fail(404, "Not found.");
    const route = matches.find(([method]) => method === req.method);
    if (!route) return fail(405, "Not allowed.", { Allow: matches.map(([m]) => m).join(", ") });
    const [, pattern, name] = route;
    if (req.method !== "GET" && !sameSite(req, url)) return fail(403, "Send that from the dashboard page.");

    try {
      // Each deploy context has its own storage; an unknown one is treated as
      // dev, never as production.
      const storage = injected ?? await blobStorage(context?.deploy?.context ?? "dev");
      if (OPEN.has(name)) return await handlers[name]({ req, url, storage });

      const email = await sessionEmail({ req, storage, now: now() });
      if (!email) return fail(401, "Sign in to see this.");
      const access = await accessFor(email, { env, storage });
      const params = pattern.exec(path);
      let store = null;
      if (name !== "me" && name !== "admin") {
        store = storeById(params[1]);
        if (!store) return fail(404, "No such store.");
      }
      if (name === "admin" || name.startsWith("save") || name.endsWith("Payment")) {
        if (!access.admin) return fail(403, "Only ARK can do that.");
      } else if (store && !access.stores.some((s) => s.id === store.id)) {
        return fail(404, "No such store.");
      }
      return await handlers[name]({ req, url, storage, email, access, store, params });
    } catch (err) {
      console.error(`[dashboard] ${req.method} ${path} failed: ${err?.stack ?? err}`);
      return fail(500, "Something went wrong. Try again in a minute.");
    }
  };
}

export default createDashboardHandler();

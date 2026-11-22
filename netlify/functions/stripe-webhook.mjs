// POST /api/stripe-webhook — events from a webhook endpoint in ARK's Stripe
// account (Developers → Webhooks), for the stores this site runs itself:
//
//   checkout.session.completed
//   checkout.session.async_payment_succeeded
//
// Today that's the RMPC season store: each paid order is emailed through
// Resend, from the sender the ARK designer uses, to every address in
// RMPC_ORDER_NOTIFICATION_EMAIL, one email per address. Any other session on
// the account, such as the designer's own checkout, which carries no
// metadata.channel, gets a 200 and nothing else.
//
// GET /api/stripe-webhook says whether this deploy has the settings below and
// how many addresses the order email goes to. It shows counts only, never an
// address or a key.
//
// Environment (Netlify → Site configuration → Environment variables):
//   STRIPE_WEBHOOK_SECRET          required. This endpoint's signing secret
//                                  (whsec_…), from its page in Stripe.
//   RESEND_API_KEY                 required for the email. A Resend key that can
//                                  send from arkscreenprinting.com.
//   RMPC_ORDER_NOTIFICATION_EMAIL  required for the email. Who hears about each
//                                  RMPC order; separate several with commas.
//
// Stripe retries a delivery that doesn't get a 2xx for up to three days. A paid
// order whose email can't go out, because a setting is missing or Resend
// refused it, is answered 5xx, so it's tried again rather than lost. Every
// answer lists each address and what happened to its email, which Stripe shows
// under the event's delivery. Resend drops a repeat of the same email to the
// same address within 24 hours (its Idempotency-Key, one per order and
// address), so a retry sends only what didn't go out. An address added later
// gets the order when the event is resent from Stripe.

import crypto from "node:crypto";
import { COLOUR, STORE } from "../../site-src/stores/rmpc/catalog.mjs";
import { describeItem, escapeHtml, shippingDetails, toOrder } from "./rmpc-orders.mjs";

export const config = { path: "/api/stripe-webhook" };

const HANDLED = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);
const SIGNATURE_TOLERANCE_SECONDS = 300;
const MAX_RECIPIENTS = 10;
// The designer's verified sender and reply-to (ark-designer server/_core/email.ts).
const FROM = "ARK Screen Printing <orders@arkscreenprinting.com>";
const REPLY_TO = STORE.contact.email;
const RESEND_EMAILS = "https://api.resend.com/emails";
// Resend allows 10 requests a second per team. Over that it answers 429, and
// one send waits this long at most before its single retry.
const MAX_RATE_LIMIT_WAIT_MS = 1500;
// An address anywhere in an entry, so "Name <a@x.com>" reads as a@x.com.
const ADDRESS = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

// Always with cents in an order email ($14.00, not the storefront's $14).
const DOLLARS = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usd = (cents) => DOLLARS.format(cents / 100);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

/** Stripe's v1 signature: HMAC-SHA256 of "<t>.<payload>" with the endpoint secret. */
export function verifySignature(payload, header, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const fields = header.split(",").map((part) => {
    const at = part.indexOf("=");
    return at < 0 ? [part.trim(), ""] : [part.slice(0, at).trim(), part.slice(at + 1).trim()];
  });
  const timestamp = Number(fields.find(([key]) => key === "t")?.[1]);
  const signatures = fields.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!Number.isInteger(timestamp) || !signatures.length) return false;
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest();
  return signatures.some((signature) => {
    const given = Buffer.from(signature, "hex");
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
}

/** RMPC_ORDER_NOTIFICATION_EMAIL read the forgiving way. Entries split on commas,
 *  semicolons or new lines, and an address is found anywhere in its entry.
 *  `ignored` holds the entries with no address in them. Repeats count once,
 *  whatever their case. */
export function parseRecipients(value) {
  const seen = new Set();
  const addresses = [];
  const ignored = [];
  for (const entry of String(value ?? "").split(/[,;\n]/)) {
    if (!entry.trim()) continue;
    const found = entry.match(ADDRESS) ?? [];
    if (!found.length) ignored.push(entry.trim());
    for (const address of found) {
      if (seen.has(address.toLowerCase())) continue;
      seen.add(address.toLowerCase());
      addresses.push(address);
    }
  }
  return { addresses: addresses.slice(0, MAX_RECIPIENTS), ignored };
}

export function recipients(value) {
  return parseRecipients(value).addresses;
}

/** What GET answers: which settings this deploy has, in counts only. */
export function settingsStatus(env) {
  const { addresses, ignored } = parseRecipients(env.RMPC_ORDER_NOTIFICATION_EMAIL);
  return {
    signingSecret: Boolean(env.STRIPE_WEBHOOK_SECRET),
    orderEmails: { resendKey: Boolean(env.RESEND_API_KEY), addresses: addresses.length, ignoredEntries: ignored.length },
  };
}

function shipsTo(session) {
  const address = shippingDetails(session)?.address;
  return [address?.city, address?.state].filter(Boolean).join(", ");
}

/** The client's copy of one order: what was bought, by whom, and how it reaches them. */
export function orderEmail(session) {
  const order = toOrder(session);
  const garments = order.items.reduce((n, item) => n + item.quantity, 0);
  const delivery = order.delivery === "Ship" ? `Shipping${shipsTo(session) ? ` to ${shipsTo(session)}` : ""}` : order.delivery;
  const buyer = [order.name, order.email].filter(Boolean);
  const lines = order.items.map((item) => ({ ...describeItem(item), size: item.size, quantity: item.quantity, totalCents: item.unitCents * item.quantity }));
  const money = [["Garments", order.subtotal], ["Shipping & handling", order.shipping], ["Sales tax", order.tax], ["Total paid", order.total]];

  const subject = `New ${STORE.name} order ${order.ref}: ${garments} garment${garments === 1 ? "" : "s"}, ${usd(order.total)}`;
  const cellStyle = "padding:6px 8px;border-bottom:1px solid #e4e4df;text-align:left";
  const html = `<div style="font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#15212c;max-width:600px">
<h1 style="font-size:20px;margin:0 0 4px">New order in the ${escapeHtml(STORE.name)}</h1>
<p style="margin:0 0 16px;color:#5c656d">Order ${escapeHtml(order.ref)} · ${escapeHtml(order.date)} Mountain</p>
<p style="margin:0 0 4px"><strong>Buyer:</strong> ${buyer.map(escapeHtml).join(" · ") || "Not given"}</p>
<p style="margin:0 0 16px"><strong>Delivery:</strong> ${escapeHtml(delivery)}</p>
<table style="border-collapse:collapse;width:100%;margin:0 0 16px">
<thead><tr><th style="${cellStyle}">Item</th><th style="${cellStyle}">Garment</th><th style="${cellStyle}">Size</th><th style="${cellStyle};text-align:right">Qty</th><th style="${cellStyle};text-align:right">Price</th></tr></thead>
<tbody>${lines.map((l) => `<tr><td style="${cellStyle}">${escapeHtml(l.product)}</td><td style="${cellStyle}">${escapeHtml(`${l.garment} · ${l.fit} · ${COLOUR}`)}</td><td style="${cellStyle}">${escapeHtml(l.size)}</td><td style="${cellStyle};text-align:right">${l.quantity}</td><td style="${cellStyle};text-align:right">${usd(l.totalCents)}</td></tr>`).join("")}</tbody>
</table>
<table style="border-collapse:collapse;margin:0 0 16px">${money.map(([label, cents]) => `<tr><td style="padding:2px 16px 2px 0">${escapeHtml(label)}</td><td style="padding:2px 0;text-align:right">${usd(cents)}</td></tr>`).join("")}</table>
<p style="margin:0;color:#5c656d">ARK Screen Printing prints and delivers every order. Reply to this email with any questions.</p>
</div>`;
  const text = [
    `New order in the ${STORE.name}`,
    `Order ${order.ref} · ${order.date} Mountain`,
    "",
    `Buyer: ${buyer.join(" · ") || "Not given"}`,
    `Delivery: ${delivery}`,
    "",
    ...lines.map((l) => `${l.quantity} × ${l.product}, ${l.garment} ${l.fit} ${COLOUR}, size ${l.size}: ${usd(l.totalCents)}`),
    "",
    ...money.map(([label, cents]) => `${label}: ${usd(cents)}`),
    "",
    "ARK Screen Printing prints and delivers every order. Reply to this email with any questions.",
  ].join("\n");
  return { subject, html, text, ref: order.ref };
}

/** One order's Idempotency-Key at Resend for one address. It's the same on
 *  every retry, and other addresses on the list don't change it. */
export function emailKey(sessionId, address) {
  const who = crypto.createHash("sha256").update(address.toLowerCase()).digest("hex").slice(0, 16);
  return `${STORE.channel}/order/${sessionId}/${who}`;
}

function retryAfterMs(res) {
  const seconds = Number(res.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, MAX_RATE_LIMIT_WAIT_MS) : MAX_RATE_LIMIT_WAIT_MS;
}

/** Sends one email to one address and says what happened. It never throws. */
async function sendTo({ apiKey, address, email, key, fetchImpl, sleep }) {
  for (let attempt = 1; ; attempt += 1) {
    let res;
    try {
      res = await fetchImpl(RESEND_EMAILS, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ from: FROM, to: [address], reply_to: REPLY_TO, subject: email.subject, html: email.html, text: email.text }),
      });
    } catch (err) {
      return { to: address, result: "failed", error: `Resend couldn't be reached: ${err?.message ?? err}` };
    }
    const data = await res.json().catch(() => null);
    // A repeat of a key Resend already sent comes back as the first answer.
    if (res.ok) return { to: address, result: "sent", id: data?.id ?? null };
    // Same key, different content: this address already got this order, as
    // the email read then.
    if (res.status === 409 && data?.name === "invalid_idempotent_request") return { to: address, result: "already sent" };
    if (res.status === 429 && attempt === 1) {
      await sleep(retryAfterMs(res));
      continue;
    }
    // Includes 409 concurrent_idempotent_requests: another delivery is sending
    // it right now, so this one is answered as a failure and retried.
    return { to: address, result: "failed", error: `Resend answered ${res.status}: ${data?.message ?? "no message"}` };
  }
}

/** Emails one order to each address in turn, each with its own key. */
export async function sendOrderEmails({ apiKey, to, session, fetchImpl = fetch, sleep = wait }) {
  const email = orderEmail(session);
  const results = [];
  for (const address of to) results.push(await sendTo({ apiKey, address, email, key: emailKey(session.id, address), fetchImpl, sleep }));
  return results;
}

export function createStripeWebhookHandler({ env = process.env, fetchImpl = fetch, now = () => Date.now(), sleep = wait } = {}) {
  return async function handler(req) {
    if (req.method === "GET") return json(200, settingsStatus(env));
    if (req.method !== "POST") return json(405, { error: "Use POST." });
    const secret = env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET isn't set, so no event can be checked");
      return json(503, { error: "Not configured." });
    }
    const payload = await req.text();
    if (!verifySignature(payload, req.headers.get("stripe-signature"), secret, Math.floor(now() / 1000))) {
      return json(400, { error: "Invalid signature." });
    }
    let event;
    try {
      event = JSON.parse(payload);
    } catch {
      return json(400, { error: "Invalid JSON." });
    }

    const session = event?.data?.object;
    // Not ours, or not paid yet: a delayed payment method completes unpaid,
    // and checkout.session.async_payment_succeeded follows when it clears.
    if (!HANDLED.has(event?.type) || session?.metadata?.channel !== STORE.channel || session.payment_status !== "paid") {
      return json(200, { received: true });
    }

    // Nothing can be sent without these, so the order is answered 503 and
    // Stripe keeps retrying until they're set and deployed.
    const to = recipients(env.RMPC_ORDER_NOTIFICATION_EMAIL);
    const missing = !env.RESEND_API_KEY ? "RESEND_API_KEY isn't set" : !to.length ? "RMPC_ORDER_NOTIFICATION_EMAIL has no email address in it" : "";
    if (missing) {
      console.error(`[stripe-webhook] RMPC order ${session.id} not emailed, Stripe will retry: ${missing}`);
      return json(503, { error: `Not emailed: ${missing}. Stripe will retry.` });
    }

    let results;
    try {
      results = await sendOrderEmails({ apiKey: env.RESEND_API_KEY, to, session, fetchImpl, sleep });
    } catch (err) {
      console.error(`[stripe-webhook] RMPC order ${session.id} email couldn't be written, Stripe will retry: ${err?.message ?? err}`);
      return json(500, { error: "The order email couldn't be written; Stripe will retry." });
    }
    for (const r of results) {
      const line = `[stripe-webhook] RMPC order ${session.id} to ${r.to}: ${r.result}${r.id ? ` (Resend ${r.id})` : ""}${r.error ? `, ${r.error}` : ""}`;
      if (r.result === "failed") console.error(line);
      else console.log(line);
    }
    const failed = results.filter((r) => r.result === "failed").length;
    const emailed = results.length - failed;
    if (failed) return json(500, { error: `${failed} of ${results.length} order emails failed; Stripe will retry.`, emailed, to: results });
    return json(200, { received: true, emailed, to: results });
  };
}

export default createStripeWebhookHandler();

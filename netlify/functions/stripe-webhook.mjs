// POST /api/stripe-webhook — events from a webhook endpoint in ARK's Stripe
// account (Developers → Webhooks), for the stores this site runs itself:
//
//   checkout.session.completed
//   checkout.session.async_payment_succeeded
//
// Today that's the RMPC season store: each paid order emails a summary to the
// client (RMPC_ORDER_NOTIFICATION_EMAIL) through Resend, from the sender the
// ARK designer uses. Any other session on the account, such as the designer's
// own checkout, which carries no metadata.channel, gets a 200 and nothing else.
//
// Environment (Netlify → Site configuration → Environment variables):
//   STRIPE_WEBHOOK_SECRET          required. This endpoint's signing secret
//                                  (whsec_…), from its page in Stripe.
//   RESEND_API_KEY                 required for the email. A Resend key that can
//                                  send from arkscreenprinting.com.
//   RMPC_ORDER_NOTIFICATION_EMAIL  required for the email. Who hears about each
//                                  RMPC order; separate several with commas.
//
// Stripe retries a delivery that doesn't get a 2xx for up to three days, and
// Resend drops a repeat of the same order (its Idempotency-Key), so a failed
// send is answered 500 and tried again rather than lost or sent twice.

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

// Always with cents in an order email ($14.00, not the storefront's $14).
const DOLLARS = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usd = (cents) => DOLLARS.format(cents / 100);

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

export function recipients(value) {
  return String(value ?? "").split(",").map((s) => s.trim()).filter((s) => /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/.test(s)).slice(0, MAX_RECIPIENTS);
}

function shipsTo(session) {
  const address = shippingDetails(session)?.address;
  return [address?.city, address?.state].filter(Boolean).join(", ");
}

/** The client's copy of one order: what was bought, by whom, and how it reaches them. */
export function orderEmail(session) {
  const order = toOrder(session);
  const garments = order.items.reduce((n, item) => n + item.quantity, 0);
  const delivery = order.delivery === "Ship" ? `Shipping${shipsTo(session) ? ` to ${shipsTo(session)}` : ""}` : STORE.pickup.label;
  const buyer = [order.name, order.email].filter(Boolean);
  const lines = order.items.map((item) => ({ ...describeItem(item), size: item.size, quantity: item.quantity, totalCents: item.unitCents * item.quantity }));
  const money = [["Garments", order.subtotal], ["Shipping", order.shipping], ["Sales tax", order.tax], ["Total paid", order.total]];

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
<table style="border-collapse:collapse;margin:0 0 16px">${money.map(([label, cents]) => `<tr><td style="padding:2px 16px 2px 0">${label}</td><td style="padding:2px 0;text-align:right">${usd(cents)}</td></tr>`).join("")}</table>
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

/** Sends one order's email. Resend's Idempotency-Key makes a repeat of the same order a no-op. */
export async function sendOrderEmail({ apiKey, to, session, fetchImpl = fetch }) {
  const { subject, html, text } = orderEmail(session);
  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `${STORE.channel}/order/${session.id}` },
    body: JSON.stringify({ from: FROM, to, reply_to: REPLY_TO, subject, html, text }),
  });
  // 409: this order's email was already sent, or is being sent right now.
  if (res.ok || res.status === 409) return { sent: res.ok };
  const data = await res.json().catch(() => null);
  throw new Error(`Resend answered ${res.status}: ${data?.message ?? "no message"}`);
}

export function createStripeWebhookHandler({ env = process.env, fetchImpl = fetch, now = () => Date.now() } = {}) {
  return async function handler(req) {
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

    const to = recipients(env.RMPC_ORDER_NOTIFICATION_EMAIL);
    if (!env.RESEND_API_KEY || !to.length) {
      console.warn(`[stripe-webhook] RMPC order ${session.id} not emailed: set RESEND_API_KEY and RMPC_ORDER_NOTIFICATION_EMAIL in Netlify`);
      return json(200, { received: true });
    }
    try {
      await sendOrderEmail({ apiKey: env.RESEND_API_KEY, to, session, fetchImpl });
    } catch (err) {
      console.error(`[stripe-webhook] RMPC order ${session.id} email failed, Stripe will retry: ${err?.message ?? err}`);
      return json(500, { error: "The order email failed; Stripe will retry." });
    }
    return json(200, { received: true, emailed: to.length });
  };
}

export default createStripeWebhookHandler();

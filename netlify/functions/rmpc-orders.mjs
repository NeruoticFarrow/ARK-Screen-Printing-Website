// The RMPC store's paid orders, read straight from Stripe (no database):
//
//   /api/rmpc/orders       a summary page: orders, money, garments to print
//   /api/rmpc/orders.csv   one row per garment line, with the buyer and delivery
//   /api/rmpc/sizes.csv    how many of each product, garment and size to print
//
// Password-protected: the browser asks for a user name (anything) and the
// password in RMPC_ORDERS_PASSWORD. Unset or shorter than 12 characters = the
// export stays locked. Reads Stripe with STRIPE_SECRET_KEY.

import crypto from "node:crypto";
import { COLOUR, DELIVERY, GARMENTS, PRODUCTS, STORE, decodeItems, deliveryKey, orderRef, productById, usd } from "../../site-src/stores/rmpc/catalog.mjs";
import { csv, money } from "../lib/csv.mjs";
import { stripeRequest } from "../lib/stripe.mjs";

export const config = { path: ["/api/rmpc/orders", "/api/rmpc/orders.csv", "/api/rmpc/sizes.csv"] };

const MIN_PASSWORD = 12;
const MAX_PAGES = 50;

function text(status, body, headers = {}) {
  return new Response(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", ...headers } });
}

function sameSecret(given, expected) {
  const a = crypto.createHash("sha256").update(String(given)).digest();
  const b = crypto.createHash("sha256").update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

export function authorised(req, password) {
  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("basic ")) return false;
  let decoded = "";
  try {
    decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
  } catch {
    return false;
  }
  const given = decoded.includes(":") ? decoded.slice(decoded.indexOf(":") + 1) : "";
  return sameSecret(given, password);
}

const DENVER_DATE = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

function denverTime(unixSeconds) {
  const parts = Object.fromEntries(DENVER_DATE.formatToParts(new Date(unixSeconds * 1000)).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
}

function oneLine(address) {
  if (!address) return "";
  return [address.line1, address.line2, address.city, [address.state, address.postal_code].filter(Boolean).join(" "), address.country !== "US" ? address.country : ""]
    .filter(Boolean).join(", ");
}

/** Where a session ships. Webhook events follow the endpoint's API version,
 *  so older shapes (shipping_details, then shipping) are read too. */
export function shippingDetails(session) {
  return session.collected_information?.shipping_details ?? session.shipping_details ?? session.shipping ?? null;
}

/** A paid Checkout session as an order row set. */
export function toOrder(session) {
  const charge = session.payment_intent && typeof session.payment_intent === "object" ? session.payment_intent.latest_charge : null;
  const refunded = charge && typeof charge === "object" ? charge.amount_refunded ?? 0 : 0;
  const total = session.amount_total ?? 0;
  const shipping = shippingDetails(session);
  const delivery = deliveryKey(session.metadata?.delivery);
  return {
    ref: orderRef(session.id),
    sessionId: session.id,
    created: session.created,
    date: denverTime(session.created),
    status: refunded <= 0 ? "Paid" : refunded >= total ? "Refunded" : "Partly refunded",
    name: session.customer_details?.name ?? shipping?.name ?? "",
    email: session.customer_details?.email ?? "",
    phone: session.customer_details?.phone ?? "",
    // "Ship", "Event pickup" or "Store pickup".
    delivery: delivery === "ship" ? "Ship" : DELIVERY[delivery].label,
    /** The DELIVERY key: "pickup" (event pickup), "store" or "ship". */
    deliveryKey: delivery,
    shipTo: delivery === "ship" ? [shipping?.name, oneLine(shipping?.address)].filter(Boolean).join(", ") : "",
    /** Town and state alone, for the client's dashboard (the street stays here). */
    shipCity: delivery === "ship" ? shipping?.address?.city ?? "" : "",
    shipState: delivery === "ship" ? shipping?.address?.state ?? "" : "",
    items: decodeItems(session.metadata),
    subtotal: session.amount_subtotal ?? 0,
    shipping: session.total_details?.amount_shipping ?? 0,
    tax: session.total_details?.amount_tax ?? 0,
    total,
    refunded,
  };
}

/** Every paid session of this store since STORE.ordersSince, oldest first. */
export async function paidOrders(secretKey, fetchImpl = fetch) {
  const since = Math.floor(Date.parse(STORE.ordersSince) / 1000);
  const orders = [];
  let startingAfter;
  for (let page = 0; page < MAX_PAGES; page++) {
    const list = await stripeRequest(secretKey, "GET", "/v1/checkout/sessions", {
      limit: 100,
      status: "complete",
      created: { gte: since },
      expand: ["data.payment_intent.latest_charge"],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    }, { fetchImpl });
    for (const session of list.data ?? []) {
      if (session.metadata?.channel === STORE.channel && session.payment_status === "paid") orders.push(toOrder(session));
    }
    if (!list.has_more || !list.data?.length) break;
    startingAfter = list.data[list.data.length - 1].id;
  }
  return orders.sort((a, b) => a.created - b.created);
}

export function describeItem(item) {
  const product = productById(item.productId);
  const garment = GARMENTS[item.variant];
  return {
    product: product?.name ?? item.productId,
    front: product?.artwork ?? "",
    garment: garment?.label ?? item.variant,
    fit: garment ? (garment.fit === "adult" ? "Adult" : "Youth") : "",
  };
}

export function ordersCsv(orders) {
  const rows = [[
    "Order", "Date (Mountain)", "Status", "Name", "Email", "Phone", "Delivery", "Ship to",
    "Product", "Front print", "Garment", "Fit", "Size", "Colour", "Qty", "Unit price", "Line total",
    "Order subtotal", "Shipping & handling", "Sales tax", "Order total", "Refunded",
  ]];
  for (const order of orders) {
    order.items.forEach((item, i) => {
      const d = describeItem(item);
      const first = i === 0;
      rows.push([
        order.ref, order.date, order.status, order.name, order.email, order.phone, order.delivery, order.shipTo,
        d.product, d.front, d.garment, d.fit, item.size, COLOUR, item.quantity, money(item.unitCents), money(item.unitCents * item.quantity),
        // Order money once per order, so a column total is the real total.
        first ? money(order.subtotal) : "", first ? money(order.shipping) : "", first ? money(order.tax) : "",
        first ? money(order.total) : "", first ? money(order.refunded) : "",
      ]);
    });
  }
  return csv(rows);
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

/** Garments to print: fully refunded orders are left out. */
export function sizeCounts(orders) {
  const counts = new Map();
  for (const order of orders) {
    if (order.status === "Refunded") continue;
    for (const item of order.items) {
      const key = `${item.productId}|${item.variant}|${item.size}`;
      counts.set(key, (counts.get(key) ?? 0) + item.quantity);
    }
  }
  const productIndex = (id) => PRODUCTS.findIndex((p) => p.id === id);
  const variantIndex = (v) => Object.keys(GARMENTS).indexOf(v);
  return [...counts.entries()].map(([key, quantity]) => {
    const [productId, variant, size] = key.split("|");
    return { productId, variant, size, quantity };
  }).sort((a, b) => productIndex(a.productId) - productIndex(b.productId) || variantIndex(a.variant) - variantIndex(b.variant) || SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));
}

export function sizesCsv(orders) {
  const counts = sizeCounts(orders);
  const rows = [["Product", "Front print", "Garment", "Fit", "Size", "Colour", "Qty"]];
  for (const c of counts) {
    const d = describeItem(c);
    rows.push([d.product, d.front, d.garment, d.fit, c.size, COLOUR, c.quantity]);
  }
  rows.push(["Total", "", "", "", "", "", counts.reduce((n, c) => n + c.quantity, 0)]);
  return csv(rows);
}

export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

export function summaryHtml(orders) {
  const live = orders.filter((o) => o.status !== "Refunded");
  const sum = (list, field) => list.reduce((n, o) => n + o[field], 0);
  const counts = sizeCounts(orders);
  const garments = counts.reduce((n, c) => n + c.quantity, 0);
  const rows = counts.map((c) => {
    const d = describeItem(c);
    return `<tr><td>${escapeHtml(d.product)}</td><td>${escapeHtml(d.garment)}</td><td>${escapeHtml(d.fit)}</td><td>${escapeHtml(c.size)}</td><td class="n">${c.quantity}</td></tr>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>RMPC store orders</title>
<style>body{font:15px/1.5 system-ui,sans-serif;color:#15212c;background:#fffefa;max-width:860px;margin:0 auto;padding:24px 16px}h1{font-size:24px;margin:0 0 4px}p{color:#5c656d;margin:0 0 20px}
dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:0 0 24px}dl div{border:1px solid #e4e4df;border-radius:6px;padding:12px}dt{font-size:12px;color:#5c656d}dd{margin:4px 0 0;font-size:20px;font-weight:600}
table{width:100%;border-collapse:collapse;margin:0 0 24px}th,td{text-align:left;padding:8px;border-bottom:1px solid #e4e4df}.n{text-align:right}a{color:#101b28;font-weight:600}</style></head><body>
<h1>RMPC store orders</h1><p>Paid orders from Stripe, as of ${escapeHtml(denverTime(Math.floor(Date.now() / 1000)))} Mountain. Fully refunded orders are left out of the counts.</p>
<dl><div><dt>Orders</dt><dd>${live.length}</dd></div><div><dt>Garments to print</dt><dd>${garments}</dd></div><div><dt>Garment sales</dt><dd>${usd(sum(live, "subtotal"))}</dd></div><div><dt>Shipping &amp; handling collected</dt><dd>${usd(sum(live, "shipping"))}</dd></div><div><dt>Sales tax collected</dt><dd>${usd(sum(live, "tax"))}</dd></div><div><dt>Refunded</dt><dd>${usd(sum(orders, "refunded"))}</dd></div></dl>
<p><a href="/api/rmpc/orders.csv">Download every order (CSV)</a> · <a href="/api/rmpc/sizes.csv">Download the print counts (CSV)</a></p>
<table><thead><tr><th>Product</th><th>Garment</th><th>Fit</th><th>Size</th><th class="n">Qty</th></tr></thead><tbody>${rows || `<tr><td colspan="5">No paid orders yet.</td></tr>`}</tbody></table>
</body></html>`;
}

export function createOrdersHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async function handler(req) {
    if (req.method !== "GET") return text(405, "Use GET.");
    const password = env.RMPC_ORDERS_PASSWORD ?? "";
    if (password.length < MIN_PASSWORD) return text(503, `The order export is locked. Set RMPC_ORDERS_PASSWORD (${MIN_PASSWORD}+ characters) in Netlify.`);
    if (!authorised(req, password)) {
      return text(401, "Sign in with the RMPC_ORDERS_PASSWORD password.", { "WWW-Authenticate": 'Basic realm="RMPC orders", charset="UTF-8"' });
    }
    const secretKey = env.STRIPE_SECRET_KEY;
    if (!secretKey) return text(503, "Set STRIPE_SECRET_KEY in Netlify first.");

    let orders;
    try {
      orders = await paidOrders(secretKey, fetchImpl);
    } catch (err) {
      console.error(`[rmpc-orders] Stripe refused the list: ${err?.message ?? err}`);
      return text(502, `Stripe refused the request: ${err?.message ?? "unknown error"}`);
    }

    const { pathname } = new URL(req.url);
    const stamp = new Date().toISOString().slice(0, 10);
    if (pathname.endsWith("/orders.csv")) {
      return text(200, ordersCsv(orders), { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="rmpc-orders-${stamp}.csv"` });
    }
    if (pathname.endsWith("/sizes.csv")) {
      return text(200, sizesCsv(orders), { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="rmpc-print-counts-${stamp}.csv"` });
    }
    return text(200, summaryHtml(orders), { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" });
  };
}

export default createOrdersHandler();

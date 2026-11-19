// What the dashboard's pages show, worked out from the API's answers: money,
// Colorado dates, order search, the print-count grids. Pure, so it's tested
// (tests/format.test.mjs) and shared by every page.

const ZONE = "America/Denver";
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

const DOLLARS = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 123456 → "$1,234.56"; a loss shows a minus sign. */
export function usd(cents) {
  const n = Number(cents) || 0;
  return n < 0 ? `−${DOLLARS.format(-n / 100)}` : DOLLARS.format(n / 100);
}

/** Whole dollars when there are no cents: for big headline figures. */
export function usdShort(cents) {
  const n = Number(cents) || 0;
  return n % 100 === 0 ? usd(n).replace(/\.00$/, "") : usd(n);
}

export const plural = (n, one, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

const ORDER_TIME = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, month: "long", day: "numeric", year: "numeric" });
const SHORT_DAY = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, month: "short", day: "numeric", year: "numeric" });
const CLOCK = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, hour: "numeric", minute: "2-digit" });

/** A Stripe time (seconds) as "Nov 19, 3:42 PM", Colorado time. */
export const orderTime = (seconds) => ORDER_TIME.format(new Date(seconds * 1000));
/** "January 10, 2027". */
export const longDay = (value) => DAY.format(new Date(value));
/** "Nov 19, 2026". */
export const shortDay = (value) => SHORT_DAY.format(new Date(value));
/** "3:42 PM". */
export const clock = (value) => CLOCK.format(new Date(value));
/** A payment's "2026-11-19" as "Nov 19, 2026" (noon, so no zone moves the day). */
export const paidDay = (ymd) => SHORT_DAY.format(new Date(`${ymd}T12:00:00-07:00`));

/** Today in Colorado as "2026-11-19", for a payment form's default date. */
export function todayYmd(now = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** One garment line, the way a client reads it. */
export const itemLine = (item) => `${item.product}, ${item.garment} ${item.fit}, ${item.size}`;

const fold = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Does `order` match what was typed in the search box? Every word must
 *  appear in the order's reference, buyer, town, or garments. */
export function matchesOrder(order, query) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fold([
    order.ref, order.buyer.name, order.buyer.email, order.delivery.label, order.delivery.place, order.status,
    ...order.items.flatMap((i) => [i.product, i.front, i.garment, i.fit, i.size]),
  ].join(" "));
  return words.every((w) => haystack.includes(w));
}

/** Orders by buyer name (A–Z), then time: the order a pickup table reads them. */
export function byBuyer(orders) {
  return [...orders].sort((a, b) => fold(a.buyer.name).localeCompare(fold(b.buyer.name)) || a.created - b.created);
}

/**
 * The print counts as one grid per product: a row per garment (blank and fit),
 * a column per size the product sold in, with row and column totals.
 */
export function printGrids(counts) {
  const products = new Map();
  for (const c of counts) {
    const p = products.get(c.product) ?? { product: c.product, front: c.front, colour: c.colour, rows: new Map(), sizes: new Set() };
    const rowKey = `${c.garment}|${c.fit}`;
    const row = p.rows.get(rowKey) ?? { garment: c.garment, fit: c.fit, sizes: {}, total: 0 };
    row.sizes[c.size] = (row.sizes[c.size] ?? 0) + c.quantity;
    row.total += c.quantity;
    p.rows.set(rowKey, row);
    p.sizes.add(c.size);
    products.set(c.product, p);
  }
  const rank = (s) => (SIZE_ORDER.includes(s) ? SIZE_ORDER.indexOf(s) : SIZE_ORDER.length);
  return [...products.values()].map((p) => {
    const sizes = [...p.sizes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    const rows = [...p.rows.values()];
    const columnTotals = Object.fromEntries(sizes.map((s) => [s, rows.reduce((n, r) => n + (r.sizes[s] ?? 0), 0)]));
    return { product: p.product, front: p.front, colour: p.colour, sizes, rows, columnTotals, total: rows.reduce((n, r) => n + r.total, 0) };
  });
}

/** "At the 25-piece price. 32 more garments reach the 50-piece price." */
export function runNote(group) {
  if (!group.next) return `At the ${group.tier}-piece price, the lowest on the quote.`;
  const more = group.next.more === 1 ? "1 more garment reaches" : `${group.next.more.toLocaleString("en-US")} more garments reach`;
  return `At the ${group.tier}-piece price. ${more} the ${group.next.at}-piece price.`;
}

/** How far a run is toward its next price break, 0 to 1. Below the second
 *  break every garment pays the first break's price, so that band starts at 0. */
export function runProgress(group, tiers) {
  if (!group.next) return 1;
  const from = group.tier === tiers[0] ? 0 : group.tier;
  return Math.max(0, Math.min(1, (group.garments - from) / (group.next.at - from)));
}

// The RMPC season store's price list and rules, in one place.
//
// The store page (app.jsx) shows these numbers, and the checkout function
// (netlify/functions/rmpc-checkout.mjs) charges them. The function never takes
// a price from the browser: it re-reads every line against this file, so what
// a buyer sees and what Stripe collects come from the same numbers.
//
// Change a price, the size range, the pickup wording or the closing date here,
// then run `npm run build` and commit. Amounts are in cents.

export const STORE = {
  /** Marks this store's Stripe Checkout sessions (metadata.channel), so the
   *  order export can find them and the ARK designer's webhook leaves them alone. */
  channel: "rmpc-store",
  name: "RMPC Season Store",
  /** The payment's description in the Stripe dashboard. */
  orderDescription: "RMPC 2027 Season Store order",
  path: "/rmpc",
  /** Sites that may show the store in an iframe. They go into the
   *  frame-ancestors of /rmpc's Content-Security-Policy, which
   *  site-src/build.mjs writes. Today that's RMPC's own Squarespace site, plus
   *  Squarespace's domains for its editor and site previews. Any other site
   *  gets an empty frame. */
  embedOn: ["https://rmparkour.com", "https://www.rmparkour.com", "https://*.squarespace.com"],
  currency: "usd",
  /** When preorders close, as an ISO date and time with its offset, e.g.
   *  "2027-01-10T23:59:00-07:00". After it, the page stops taking orders and the
   *  checkout function refuses them. null keeps the store open. */
  ordersCloseAt: null,
  /** The order export only lists sessions from this date on. */
  ordersSince: "2026-11-01T00:00:00Z",
  /** Event pickup, free. The owner rule (2026-10-15) is that ARK's own address
   *  is never offered as a pickup counter, so pickup is at an RMPC event. */
  pickup: {
    label: "Event pickup",
    short: "We'll email pickup details",
    sentence: "Pick up your order free at an RMPC event. We'll email you the pickup details before the event.",
  },
  /** The ARK designer's shipping rule (ark-designer shared/const.ts):
   *  $8 for the first garment, $3 for each additional one, at most $35. */
  shipping: { firstCents: 800, eachAdditionalCents: 300, maxCents: 3500, countries: ["US"] },
  contact: { phoneDisplay: "(719) 280-2638", phoneHref: "tel:+17192802638", email: "alex@arkscreenprinting.com" },
};

/** What a buyer pays per garment, before sales tax (client, 2026-11-16). */
export const PRICE_CENTS = { tee: 2999, crew: 5999 };

/** Added to the price for a size. 0 keeps every size at the same price; the
 *  quote's 2XL upcharges are ARK's cost, not the buyer's. */
export const SIZE_UPCHARGE_CENTS = { "2XL": 0 };

export const GARMENTS = {
  "gildan-adult": { label: "Gildan 5000", type: "tee", fit: "adult", blurb: "Classic cotton tee" },
  "gildan-youth": { label: "Gildan 5000B", type: "tee", fit: "youth", blurb: "Classic cotton tee" },
  "next-level-adult": { label: "Next Level 3600", type: "tee", fit: "adult", blurb: "Soft everyday tee" },
  "next-level-youth": { label: "Next Level 3310", type: "tee", fit: "youth", blurb: "Soft everyday tee" },
  "independent-adult": { label: "Independent SS3000", type: "crew", fit: "adult", blurb: "Independent Trading Co. midweight crewneck" },
  "independent-youth": { label: "Independent SS3001Y", type: "crew", fit: "youth", blurb: "Independent Trading Co. midweight crewneck" },
};

/** The four products. `artwork` is which front print it carries; every
 *  product has the RMPC crown on the back. Images live in app.jsx. */
export const PRODUCTS = [
  {
    id: "wordmark-tee", name: "RMPC Team Tee", type: "tee", artwork: "Team wordmark", design: "The classic wordmark",
    description: "The unmistakable RMPC wordmark up front. The championship crown on the back. A clean everyday tee for athletes, families, and the whole crew.",
  },
  {
    id: "athlete-tee", name: "RMPC Athlete Tee", type: "tee", artwork: "Athlete graphic", design: "Made for movement",
    description: "A bold red-and-blue parkour graphic on the front, with the RMPC crown on the back. Bring a little competition-day energy to every day.",
  },
  {
    id: "wordmark-crew", name: "RMPC Team Crewneck", type: "crew", artwork: "Team wordmark", design: "Your new warm-up layer",
    description: "The classic RMPC wordmark and championship crown on an Independent midweight crewneck. An easy layer for early starts and between-round downtime.",
  },
  {
    id: "athlete-crew", name: "RMPC Athlete Crewneck", type: "crew", artwork: "Athlete graphic", design: "Big energy. Everyday comfort.",
    description: "Our athlete graphic on a black Independent midweight crewneck, finished with the RMPC crown on the back. A season staple for the sidelines and beyond.",
  },
];

export const COLOUR = "Black";
export const MAX_QUANTITY = 99;
/** Distinct lines a bag may hold (each up to MAX_QUANTITY). */
export const MAX_LINES = 30;

/** The garment options for a product type, in the order the page shows them. */
export const BRANDS_BY_TYPE = { tee: ["gildan", "next-level"], crew: ["independent"] };

export function variantKey(brand, fit) {
  return `${brand}-${fit}`;
}

/** Sizes for a product type and fit, as the approved preview offered them. */
export function sizesFor(type, fit) {
  if (fit === "adult") return ["S", "M", "L", "XL", "2XL"];
  return type === "tee" ? ["XS", "S", "M", "L", "XL"] : ["S", "M", "L", "XL"];
}

export function productById(id) {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

/** Price of one garment of `variant` in `size`, in cents. */
export function unitPriceCents(variant, size = "") {
  const garment = GARMENTS[variant];
  if (!garment) throw new Error(`unknown garment ${variant}`);
  return PRICE_CENTS[garment.type] + (SIZE_UPCHARGE_CENTS[size] ?? 0);
}

/** Lowest and highest price a product sells at, across its garments and sizes. */
export function priceRange(product) {
  const prices = Object.entries(GARMENTS)
    .filter(([, g]) => g.type === product.type)
    .flatMap(([key, g]) => sizesFor(product.type, g.fit).map((size) => unitPriceCents(key, size)));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** "$8", or "$7.50" for an amount with cents. */
export function usd(cents) {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

/** The shipping rule in words, built from the numbers above. */
export const SHIPPING_RULE_TEXT = `${usd(STORE.shipping.firstCents)} for the first garment and ${usd(STORE.shipping.eachAdditionalCents)} for each additional garment, up to ${usd(STORE.shipping.maxCents)} an order`;
export const SHIPPING_RULE_SHORT = `${usd(STORE.shipping.firstCents)} first item + ${usd(STORE.shipping.eachAdditionalCents)} each extra · max ${usd(STORE.shipping.maxCents)}`;

/** The short reference a buyer and the order export both show for a Stripe
 *  Checkout session: its last eight characters. */
export function orderRef(sessionId) {
  return typeof sessionId === "string" && sessionId.length >= 8 ? sessionId.slice(-8).toUpperCase() : "";
}

/** Shipping for `count` garments, in cents. Nothing ships for an empty bag. */
export function shippingCents(count) {
  const { firstCents, eachAdditionalCents, maxCents } = STORE.shipping;
  return count > 0 ? Math.min(maxCents, firstCents + (count - 1) * eachAdditionalCents) : 0;
}

export function lineKey(productId, variant, size) {
  return `${productId}:${variant}:${size}`;
}

/** A bag line as the page stores it, or null when it isn't one this store
 *  sells: an unknown product or garment, a crewneck garment on a tee (or the
 *  reverse), a size the fit doesn't come in, or a quantity outside 1–99. */
export function normaliseLine(line) {
  if (!line || typeof line !== "object") return null;
  const { productId, variant, size, quantity } = line;
  const product = productById(productId);
  const garment = typeof variant === "string" && Object.hasOwn(GARMENTS, variant) ? GARMENTS[variant] : null;
  if (!product || !garment || garment.type !== product.type) return null;
  if (typeof size !== "string" || !sizesFor(product.type, garment.fit).includes(size)) return null;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return null;
  return { key: lineKey(productId, variant, size), productId, variant, size, quantity };
}

/** Totals for a bag, in cents. Invalid lines are skipped. */
export function bagTotals(lines, delivery) {
  const valid = (Array.isArray(lines) ? lines : []).map(normaliseLine).filter(Boolean);
  const count = valid.reduce((n, l) => n + l.quantity, 0);
  const subtotal = valid.reduce((n, l) => n + l.quantity * unitPriceCents(l.variant, l.size), 0);
  const shipping = delivery === "ship" ? shippingCents(count) : 0;
  return { count, subtotal, shipping, total: subtotal + shipping };
}

/** What the checkout charges for a bag the browser sent. Every line is
 *  re-read against this file; nothing priced by the browser is used. Returns
 *  `{ ok: false, error }` with a message the buyer can act on. */
export function priceOrder(input) {
  const delivery = input?.delivery;
  if (delivery !== "pickup" && delivery !== "ship") return { ok: false, error: "Choose event pickup or shipping." };
  const raw = input?.lines;
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: "Your bag is empty." };
  if (raw.length > MAX_LINES) return { ok: false, error: `A bag can hold up to ${MAX_LINES} different items. Split it into two orders.` };
  const merged = new Map();
  for (const entry of raw) {
    const line = normaliseLine(entry);
    if (!line) return { ok: false, error: "Something in your bag isn't available. Remove it and try again." };
    const prior = merged.get(line.key);
    const quantity = (prior?.quantity ?? 0) + line.quantity;
    if (quantity > MAX_QUANTITY) return { ok: false, error: `You can order up to ${MAX_QUANTITY} of one item.` };
    merged.set(line.key, { ...line, quantity });
  }
  const lines = [...merged.values()].map((line) => {
    const product = productById(line.productId);
    const garment = GARMENTS[line.variant];
    const unitCents = unitPriceCents(line.variant, line.size);
    return {
      ...line,
      unitCents,
      totalCents: unitCents * line.quantity,
      name: product.name,
      detail: `${garment.label} · ${garment.fit === "adult" ? "Adult" : "Youth"} · ${line.size} · ${COLOUR}`,
    };
  });
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotalCents = lines.reduce((n, l) => n + l.totalCents, 0);
  return { ok: true, delivery, lines, count, subtotalCents, shippingCents: delivery === "ship" ? shippingCents(count) : 0 };
}

/** True once STORE.ordersCloseAt has passed. */
export function ordersClosed(now = Date.now()) {
  if (!STORE.ordersCloseAt) return false;
  const at = Date.parse(STORE.ordersCloseAt);
  return Number.isFinite(at) && now >= at;
}

/** "January 10, 2027" in Colorado time, or null when no date is set. */
export function closingDateLabel() {
  if (!STORE.ordersCloseAt) return null;
  const at = new Date(STORE.ordersCloseAt);
  if (Number.isNaN(at.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Denver" }).format(at);
}

// ── Stripe metadata ──────────────────────────────────────────────────────────
// A paid order's lines travel in the Checkout session's metadata, so the order
// export reads everything from one list call. Stripe allows 50 keys of up to
// 500 characters; lines are packed into `items_1`, `items_2`, … as
// "productId|variant|size|quantity|unitCents" joined by commas.

const ITEM_CHUNK = 480;

export function encodeItems(lines) {
  const parts = lines.map((l) => [l.productId, l.variant, l.size, l.quantity, l.unitCents].join("|"));
  const chunks = [];
  let current = "";
  for (const part of parts) {
    const next = current ? `${current},${part}` : part;
    if (next.length > ITEM_CHUNK) {
      chunks.push(current);
      current = part;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return Object.fromEntries(chunks.map((chunk, i) => [`items_${i + 1}`, chunk]));
}

export function decodeItems(metadata) {
  const keys = Object.keys(metadata ?? {}).filter((k) => /^items_\d+$/.test(k)).sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
  return keys.flatMap((k) => String(metadata[k]).split(",").filter(Boolean)).map((part) => {
    const [productId, variant, size, quantity, unitCents] = part.split("|");
    return { productId, variant, size, quantity: Number(quantity), unitCents: Number(unitCents) };
  });
}

// What the client dashboard shows, worked out from a store's paid orders:
// the orders as a client may see them, the totals, the print counts, the
// profit against ARK's cost sheet, and the spreadsheets. Pure: no I/O, so
// every number is unit-tested.
//
// A client sees each buyer's name, email and delivery (the town and state when
// it ships), as in the order email. The street address and phone stay in
// ARK's export.

import { csv, money } from "../csv.mjs";
import { DELIVERY_LABELS } from "./stores.mjs";

const sum = (list, pick) => list.reduce((n, x) => n + pick(x), 0);
const live = (orders) => orders.filter((o) => o.status !== "Refunded");

/** One order (as the store's export reads it) the way a client sees it. */
export function clientOrder(store, order) {
  const kind = store.deliveryKind(order);
  const items = order.items.map((item) => ({
    productId: item.productId,
    variant: item.variant,
    ...store.describe(item),
    size: item.size,
    quantity: item.quantity,
    unitCents: item.unitCents,
    totalCents: item.unitCents * item.quantity,
  }));
  return {
    ref: order.ref,
    created: order.created,
    date: order.date,
    status: order.status,
    buyer: { name: order.name, email: order.email },
    delivery: { kind, label: DELIVERY_LABELS[kind], place: kind === "ship" ? [order.shipCity, order.shipState].filter(Boolean).join(", ") : "" },
    items,
    garments: sum(items, (i) => i.quantity),
    subtotalCents: order.subtotal,
    shippingCents: order.shipping,
    taxCents: order.tax,
    totalCents: order.total,
    refundedCents: order.refunded,
  };
}

/** The headline numbers. A fully refunded order counts for nothing; its
 *  refund still shows as refunded. */
export function totals(orders) {
  const kept = live(orders);
  const byDelivery = { event: 0, store: 0, ship: 0 };
  for (const o of kept) byDelivery[o.delivery.kind] = (byDelivery[o.delivery.kind] ?? 0) + 1;
  return {
    orders: kept.length,
    garments: sum(kept, (o) => o.garments),
    salesCents: sum(kept, (o) => o.subtotalCents),
    shippingCents: sum(kept, (o) => o.shippingCents),
    taxCents: sum(kept, (o) => o.taxCents),
    refundedCents: sum(orders, (o) => o.refundedCents),
    byDelivery,
  };
}

// ── Profit ──────────────────────────────────────────────────────────────────
// Each garment earns what the buyer paid for it minus ARK's price for it.
// ARK's price comes from the store's cost sheet: per design group and blank,
// a price at each run size (25 / 50 / 100 garments), plus an upcharge for the
// bigger sizes. The run is every garment sold so far with that group's front
// print, tees and crewnecks together, so the price per garment can only drop
// as more sell. Shipping & handling goes to ARK for shipping, sales tax to the
// state, and Stripe's card fees are ARK's.

/** The run size whose price applies to `garments`: the biggest break reached,
 *  or the first one when none is. */
export function tierFor(tiers, garments) {
  let tier = tiers[0];
  for (const t of tiers) if (garments >= t) tier = t;
  return tier;
}

/** The next price break above `garments`, or null at the last one. */
export function nextBreak(tiers, garments) {
  const at = tiers.find((t, i) => i > 0 && garments < t);
  return at === undefined ? null : { at, more: at - garments };
}

/** ARK's price for one garment, in cents, or null when the sheet has no price
 *  for it. */
export function unitCost(costing, sheet, groupId, blankId, tier, size) {
  const row = sheet?.groups?.[groupId]?.[blankId];
  const base = row?.[String(tier)];
  if (!Number.isInteger(base)) return null;
  const blank = costing.blanks.find((b) => b.id === blankId);
  const up = blank?.upcharge && costing.upchargeSizes.includes(size) ? row.upcharge ?? 0 : 0;
  return base + (Number.isInteger(up) ? up : 0);
}

export function profitReport(store, orders, sheet) {
  const { costing } = store;
  const groupOf = (productId) => costing.groups.find((g) => g.products.includes(productId))?.id ?? null;
  const kept = live(orders);

  const runs = Object.fromEntries(costing.groups.map((g) => [g.id, 0]));
  for (const o of kept) for (const item of o.items) {
    const g = groupOf(item.productId);
    if (g) runs[g] += item.quantity;
  }
  const groups = costing.groups.map((g) => ({
    id: g.id,
    label: g.label,
    note: g.note,
    garments: runs[g.id],
    tier: tierFor(costing.tiers, runs[g.id]),
    next: nextBreak(costing.tiers, runs[g.id]),
  }));
  const tierOf = (g) => groups.find((x) => x.id === g)?.tier ?? costing.tiers[0];

  const rows = new Map();
  const missing = new Set();
  for (const o of kept) for (const item of o.items) {
    const g = groupOf(item.productId);
    const key = `${item.productId}|${item.variant}`;
    const row = rows.get(key) ?? { productId: item.productId, variant: item.variant, product: item.product, garment: item.garment, fit: item.fit, group: g, quantity: 0, salesCents: 0, costCents: 0, priced: true };
    const unit = g ? unitCost(costing, sheet, g, item.variant, tierOf(g), item.size) : null;
    row.quantity += item.quantity;
    row.salesCents += item.totalCents;
    if (unit === null) {
      row.priced = false;
      missing.add(`${g ?? "none"}|${item.variant}`);
    } else {
      row.costCents += unit * item.quantity;
    }
    rows.set(key, row);
  }
  const productIndex = (id) => store.productOrder?.indexOf(id) ?? 0;
  const lines = [...rows.values()]
    .map((r) => ({ ...r, profitCents: r.salesCents - r.costCents }))
    .sort((a, b) => productIndex(a.productId) - productIndex(b.productId) || a.product.localeCompare(b.product) || costing.blanks.findIndex((x) => x.id === a.variant) - costing.blanks.findIndex((x) => x.id === b.variant));

  // A partial refund comes off the profit, at most the order's garment money.
  const refundsCents = sum(kept.filter((o) => o.status === "Partly refunded"), (o) => Math.min(o.refundedCents, o.subtotalCents));
  const salesCents = sum(lines, (l) => l.salesCents);
  const costCents = sum(lines, (l) => l.costCents);
  return {
    ready: Boolean(sheet?.groups),
    complete: Boolean(sheet?.groups) && missing.size === 0,
    missing: [...missing].map((k) => {
      const [group, blank] = k.split("|");
      return { group: costing.groups.find((g) => g.id === group)?.label ?? "Not in a design group", blank: costing.blanks.find((b) => b.id === blank)?.label ?? blank };
    }),
    groups,
    lines,
    totals: { salesCents, costCents, refundsCents, profitCents: salesCents - costCents - refundsCents },
  };
}

/** What ARK has paid the client, and what's left against the profit. */
export function paymentsSummary(payments, profitCents) {
  const list = [...(payments ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.recordedAt - a.recordedAt);
  const paidCents = sum(list, (p) => p.amountCents);
  return { list, paidCents, owedCents: Math.max(0, profitCents - paidCents) };
}

// ── Cost sheets ─────────────────────────────────────────────────────────────
// Stored in cents: { groups: { <group>: { <blank>: { "25": 1234, "50": 1100,
// "100": 950, upcharge: 200 } } } }. ARK types or pastes them in dollars.

const DOLLARS = /^\$?\s*(\d{1,4})(?:\.(\d{1,2}))?$/;

/** "$12.34", "12.34", 12.34 or "12" → 1234; "" or "—" → null; else NaN. */
export function toCents(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 && value < 10_000 ? Math.round(value * 100) : NaN;
  const s = String(value).trim().replace(/^\+/, "");
  if (s === "" || s === "—" || s === "-" || s === "–") return null;
  const m = DOLLARS.exec(s);
  return m ? Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0")) : NaN;
}

/**
 * A cost sheet as ARK sent it (dollars, by group and blank, with the run
 * sizes as keys and "2XL" or "upcharge" for the upcharge), checked against
 * the store's costing. Answers `{ ok: true, sheet }` in cents, or
 * `{ ok: false, error }` naming the first bad cell.
 */
export function parseCostSheet(costing, input) {
  const source = input?.groups && typeof input.groups === "object" ? input.groups : input;
  if (!source || typeof source !== "object" || Array.isArray(source)) return { ok: false, error: "That isn't a cost sheet." };
  const groups = {};
  for (const [groupId, blanks] of Object.entries(source)) {
    const group = costing.groups.find((g) => g.id === groupId);
    if (!group) return { ok: false, error: `This store has no design group "${groupId}".` };
    if (!blanks || typeof blanks !== "object") return { ok: false, error: `${group.label}: no prices.` };
    groups[groupId] = {};
    for (const [blankId, prices] of Object.entries(blanks)) {
      const blank = costing.blanks.find((b) => b.id === blankId);
      if (!blank) return { ok: false, error: `${group.label}: this store has no blank "${blankId}".` };
      const row = {};
      for (const tier of costing.tiers) {
        const cents = toCents(prices?.[String(tier)]);
        if (Number.isNaN(cents)) return { ok: false, error: `${group.label}, ${blank.label}: the ${tier}-piece price isn't a dollar amount.` };
        if (cents !== null) row[String(tier)] = cents;
      }
      const up = toCents(prices?.upcharge ?? prices?.["2XL"]);
      if (Number.isNaN(up)) return { ok: false, error: `${group.label}, ${blank.label}: the upcharge isn't a dollar amount.` };
      if (up !== null && up > 0) row.upcharge = up;
      if (Object.keys(row).length) groups[groupId][blankId] = row;
    }
  }
  return { ok: true, sheet: { groups } };
}

/** A stored sheet back in dollars, the shape parseCostSheet takes. */
export function costSheetInDollars(costing, sheet) {
  const out = {};
  for (const g of costing.groups) {
    out[g.id] = {};
    for (const b of costing.blanks) {
      const row = sheet?.groups?.[g.id]?.[b.id];
      if (!row) continue;
      out[g.id][b.id] = Object.fromEntries([
        ...costing.tiers.filter((t) => Number.isInteger(row[String(t)])).map((t) => [String(t), money(row[String(t)])]),
        ...(row.upcharge ? [["upcharge", money(row.upcharge)]] : []),
      ]);
    }
  }
  return out;
}

// ── Spreadsheets ────────────────────────────────────────────────────────────

export function clientOrdersCsv(orders) {
  const rows = [[
    "Order", "Date (Mountain)", "Status", "Name", "Email", "Delivery", "Ships to",
    "Product", "Front print", "Garment", "Fit", "Size", "Colour", "Qty", "Unit price", "Line total",
    "Order garments", "Shipping & handling", "Sales tax", "Order total", "Refunded",
  ]];
  for (const o of orders) {
    o.items.forEach((item, i) => {
      const first = i === 0;
      rows.push([
        o.ref, o.date, o.status, o.buyer.name, o.buyer.email, o.delivery.label, o.delivery.place,
        item.product, item.front ?? "", item.garment, item.fit, item.size, item.colour ?? "", item.quantity, money(item.unitCents), money(item.totalCents),
        // Order money once per order, so a column total is the real total.
        first ? money(o.subtotalCents) : "", first ? money(o.shippingCents) : "", first ? money(o.taxCents) : "",
        first ? money(o.totalCents) : "", first ? money(o.refundedCents) : "",
      ]);
    });
  }
  return csv(rows);
}

export function printCountsCsv(counts) {
  const rows = [["Product", "Front print", "Garment", "Fit", "Size", "Colour", "Qty"]];
  for (const c of counts) rows.push([c.product, c.front ?? "", c.garment, c.fit, c.size, c.colour ?? "", c.quantity]);
  rows.push(["Total", "", "", "", "", "", sum(counts, (c) => c.quantity)]);
  return csv(rows);
}

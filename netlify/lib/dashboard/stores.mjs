// The made-for-you stores the client dashboard knows about. Each entry says
// how to read the store's paid orders, how to describe a garment line, and how
// ARK's costs are laid out for it (which designs share a print run, which
// blanks, which run sizes). The costs themselves are ARK's quote to the client,
// so they live in the dashboard's storage (storage.mjs), never here: this
// repository is public.
//
// A new store joins by adding an entry here once its checkout tags its Stripe
// sessions with a metadata.channel of its own, the way the RMPC store does.

import { COLOUR, GARMENTS, PRODUCTS, STORE as RMPC, ordersClosed as rmpcClosed } from "../../../site-src/stores/rmpc/catalog.mjs";
import { describeItem as rmpcDescribe, paidOrders as rmpcPaidOrders, sizeCounts as rmpcSizeCounts } from "../../functions/rmpc-orders.mjs";

/** How an order reaches the buyer, the same three ways in every store. */
export const DELIVERY_LABELS = { event: "Event pickup", store: "Store pickup", ship: "Shipping" };

const rmpc = {
  id: "rmpc",
  name: RMPC.name,
  client: "Rocky Mountain Parkour Championships",
  path: RMPC.path,
  /** ARK's full export, with buyers' addresses and phones. */
  exportPath: "/api/rmpc/orders",
  /** Who already gets the order emails: offered as the first client list. */
  notifyEnv: "RMPC_ORDER_NOTIFICATION_EMAIL",
  closesAt: () => RMPC.ordersCloseAt,
  isClosed: (now) => rmpcClosed(now),
  loadOrders: (secretKey, fetchImpl) => rmpcPaidOrders(secretKey, fetchImpl),
  /** The store's own delivery keys ("pickup" is RMPC's event pickup). */
  deliveryKind: (order) => ({ pickup: "event", store: "store", ship: "ship" })[order.deliveryKey] ?? "event",
  describe: (item) => ({ ...rmpcDescribe(item), colour: COLOUR }),
  /** Products in the order the store shows them. */
  productOrder: PRODUCTS.map((p) => p.id),
  /** What to print, in catalogue order; fully refunded orders are left out. */
  printCounts: (orders) => rmpcSizeCounts(orders).map((c) => ({ ...rmpcDescribe(c), colour: COLOUR, size: c.size, quantity: c.quantity })),
  costing: {
    /** Garments that share a front print share a run: every product carries
     *  the same 3-colour crown on the back. */
    groups: [
      { id: "athlete", label: "Athlete graphic", note: "Quote A: 3-colour front + 3-colour back", products: PRODUCTS.filter((p) => p.artwork === "Athlete graphic").map((p) => p.id) },
      { id: "wordmark", label: "Team wordmark", note: "Quote B: 1-colour front + 3-colour back", products: PRODUCTS.filter((p) => p.artwork === "Team wordmark").map((p) => p.id) },
    ],
    blanks: Object.entries(GARMENTS).map(([id, g]) => ({ id, label: `${g.label}, ${g.fit}`, type: g.type, upcharge: g.fit === "adult" })),
    /** Price breaks by garments in the run; fewer than the first pay the first. */
    tiers: [25, 50, 100],
    /** Sizes that add the blank's upcharge to ARK's price. */
    upchargeSizes: ["2XL"],
  },
};

export const STORES = [rmpc];

export const storeById = (id) => STORES.find((s) => s.id === id) ?? null;

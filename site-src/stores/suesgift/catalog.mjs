// The Sue's Gift sample store's products, colours, prices and delivery, in
// one place. The page (app.jsx) shows these and the tests check them.
//
// It's a sample ARK made for Sue's Gift Gynecologic Cancer Support after they
// asked to see one: the bag works and adds up, but nothing can be bought
// (STORE.sample). Samples ship to the door only (Alex, 2026-11-27); store or
// event pickup is added when a real store needs it. When the designs and
// prices are approved, the checkout follows the RMPC store's
// (../rmpc/README.md).
//
// Amounts are in cents. The handling fee and the shipping rule are every
// store's (../rules.mjs).

import { HANDLING_CENTS, SHIPPING_RULE, shippingAndHandlingCents } from "../rules.mjs";

export const STORE = {
  name: "Sue's Gift Shop",
  client: "Sue's Gift",
  path: "/suesgift",
  /** A sample: the page says so, and the bag has no checkout. */
  sample: true,
  currency: "usd",
  /** Shipped orders: every store's handling fee and shipping rule
   *  (../rules.mjs): $4.50 handling, plus $8 for the first item and $3 for
   *  each additional one, at most $35. */
  shipping: { handlingCents: HANDLING_CENTS, ...SHIPPING_RULE, countries: ["US"] },
  contact: { phoneDisplay: "(719) 280-2638", phoneHref: "tel:+17192802638", email: "alex@arkscreenprinting.com" },
};

// ── Colours ────────────────────────────────────────────────────────────────
// AS Colour's own names and swatch colours (ascolour.com, 2026-11-19), in
// their order.

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const colours = (list) => list.map(([name, hex, extra]) => ({ id: slug(name), name, hex, ...extra }));

/** Staple Tee 5001: all 75 colours. */
export const TEE_COLOURS = colours([
  ["White", "#FFFFFF"], ["Natural", "#FBF7EE"], ["Ecru", "#E4E0D4"], ["Butter", "#F4F0D7"], ["Lemonade", "#EADE8C"],
  ["Yellow", "#E8C045"], ["Sunset", "#F7C46C"], ["Mustard", "#E7AD52"], ["Gold", "#F8AC32"], ["Orange", "#E56929"],
  ["Autumn", "#BE4228"], ["Fire", "#D2201C"], ["Pale Pink", "#F6D5C6"], ["Pink", "#F0D2D4"], ["Bubblegum", "#EBA3B1"],
  ["Charity Pink", "#D56793"], ["Berry", "#8B4354"], ["Clay", "#875632"], ["Copper", "#88472D"], ["Red", "#BB1016"],
  ["Cardinal", "#821822"], ["Burgundy", "#512024"], ["Plum", "#433238"], ["Purple", "#603E71"], ["Mauve", "#86727B"],
  ["Orchid", "#E3DDE3"], ["Pale Blue", "#B1C3C7"], ["Seafoam", "#E6F3F4"], ["Slate Blue", "#74929A"], ["Smoke", "#98A0A5"],
  ["Powder", "#989FB1"], ["Carolina Blue", "#A0BFE2"], ["Fog Blue", "#7488A9"], ["Arctic Blue", "#2C78AC"], ["Hydro", "#3D81AE"],
  ["Lapis", "#6772A8"], ["Bright Royal", "#395793"], ["Cobalt", "#212B51"], ["Petrol Blue", "#404A53"], ["Midnight Blue", "#35374C"],
  ["Navy", "#1E202C"], ["Citrus", "#BDEA73"], ["Lime", "#DDE0A7"], ["Pistachio", "#B2B799"], ["Safari", "#9F987B"],
  ["Eucalyptus", "#938E71"], ["Moss", "#8D8646"], ["Kiwi", "#849161"], ["Sage", "#768D7D"], ["Mineral", "#7E958D"],
  ["Topaz", "#58AE95"], ["Charlotte", "#007A8E"], ["Atlantic", "#10535B"], ["Kelly Green", "#027D4F"], ["Cypress", "#51594A"],
  ["Army", "#4E4A36"], ["Jade", "#084037"], ["Forest Green", "#355138"], ["Pine Green", "#1D342A"], ["Dark Chocolate", "#3C2D26"],
  ["Chestnut", "#4E332A"], ["Walnut", "#6B5A4A"], ["Camel", "#A67A3F"], ["Khaki", "#AD8F69"], ["Cocoa", "#865E49"],
  ["Mushroom", "#B2A795"], ["Sand", "#B7B09D"], ["Bone", "#D1CDCA"], ["Light Grey", "#B9B5AC"],
  ["Athletic Heather", "#A4A4A2", { heather: true }], ["Granite", "#A1A0A5", { heather: true }],
  ["Shadow", "#626367"], ["Charcoal", "#464646"], ["Coal", "#323031"], ["Black", "#000000"],
]);

/** Carrie Tote 1001: all 23 colours. */
export const CARRIE_COLOURS = colours([
  ["Cream", "#FAF4E8"], ["Pink", "#F0D2D4"], ["Charity Pink", "#D56793"], ["Sunset", "#F7C46C"], ["Mustard", "#E7AD52"],
  ["Orange", "#E56929"], ["Red", "#BB1016"], ["Burgundy", "#512024"], ["Bone", "#D1CDCA"], ["Mushroom", "#B2A795"],
  ["Khaki", "#AD8F69"], ["Camel", "#A67A3F"], ["Walnut", "#6B5A4A"], ["Dark Chocolate", "#3C2D26"], ["Kelly Green", "#027D4F"],
  ["Forest Green", "#355138"], ["Pine Green", "#1D342A"], ["Army", "#4E4A36"], ["Liberty", "#253668"], ["Petrol Blue", "#404A53"],
  ["Navy", "#1E202C"], ["Coal", "#323031"], ["Black", "#000000"],
]);

const relativeLuminance = (hex) => {
  const channel = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
};

/** White ink needs a garment it stands out on. Below this contrast (white,
 *  cream, pastels, light greys and yellows) a print uses its teal-and-ink
 *  version; above it, its one-colour white version. */
export const LIGHT_GARMENT_CONTRAST = 2.3;

export function isLightGarment(hex) {
  return 1.05 / (relativeLuminance(hex) + 0.05) < LIGHT_GARMENT_CONTRAST;
}

// ── Garments and products ──────────────────────────────────────────────────

export const TEE_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
export const ONE_SIZE = "One size";

export const GARMENTS = {
  tee: {
    label: "AS Colour Staple Tee",
    style: "5001",
    kind: "tee",
    facts: ["Regular fit", "5.3 oz, 100% combed cotton", "Double-needle hems"],
    sizes: TEE_SIZES,
    colours: TEE_COLOURS,
    views: { front: "tee-front", back: "tee-back" },
  },
  carrie: {
    label: "AS Colour Carrie Tote",
    style: "1001",
    kind: "tote",
    facts: ["Heavyweight 9.4 oz cotton canvas", "16.5″ × 16.5″, 3.7″ gusset", "Reinforced shoulder straps"],
    sizes: [ONE_SIZE],
    colours: CARRIE_COLOURS,
    views: { front: "carrie", back: "carrie" },
  },
};

/** What a buyer pays, before sales tax. Sample prices, the same as the
 *  Best of the Springs sample's, for Alex and Sue's Gift to confirm. */
export const PRICE_CENTS = { tee: 2999, carrie: 2499 };

/** Added to a tee's price for its size (the bigger blanks cost more). */
export const SIZE_UPCHARGE_CENTS = { "2XL": 300, "3XL": 300, "4XL": 500, "5XL": 500 };

/** Where each print sits. `box` is [left, top, width] on the garment's
 *  1000px canvas (its height follows the artwork); the tee is about 26px to
 *  the inch, the tote about 33. `size` is the print size that works out to.
 *  `art` names a design in images/art/ (tools/art.py); each has a white
 *  version for dark garments. Designs use only words Sue's Gift publishes
 *  (suesgift.org, 2026-11-27). */
export const PRODUCTS = [
  {
    id: "not-alone-tee",
    name: "You're Not Alone Tee",
    garment: "tee",
    collection: "everyday",
    colour: "charlotte",
    cardView: "back",
    blurb: "The Sue's Gift heart on the chest, and \u201cYou\u2019re not alone.\u201d across the back.",
    prints: {
      front: { art: "heart", box: [548, 236, 120], place: "Left chest", size: "4.6″ × 2.6″" },
      back: { art: "not-alone", box: [325, 214, 350], place: "Upper back", size: "13.5″ × 4″" },
    },
  },
  {
    id: "boa-2027-tee",
    name: "Be Ovary Aware 2027 Tee",
    garment: "tee",
    collection: "events",
    colour: "seafoam",
    cardView: "front",
    blurb: "For the 19th annual 5K run + 3K walk, with the race's own line across the back.",
    prints: {
      front: { art: "boa-front", box: [343, 230, 314], place: "Full front", size: "12″ × 6.7″" },
      back: { art: "boa-back", box: [330, 200, 340], place: "Upper back", size: "13″ × 5.1″" },
    },
  },
  {
    id: "logo-tee",
    name: "Sue's Gift Logo Tee",
    garment: "tee",
    collection: "everyday",
    colour: "white",
    cardView: "front",
    blurb: "The full Sue's Gift logo across the chest and the round mark at the back of the neck.",
    prints: {
      front: { art: "logo", box: [358, 236, 284], place: "Center chest", size: "11″ × 4.4″" },
      back: { art: "badge", box: [462, 150, 76], place: "Back neck", size: "2.9″ × 2.9″" },
    },
  },
  {
    id: "teeoff-tee",
    name: "TEAL Tee-Off Tee",
    garment: "tee",
    collection: "events",
    colour: "white",
    cardView: "back",
    blurb: "For the charity golf tournament: a small mark up front, the full tournament graphic across the back.",
    prints: {
      front: { art: "teeoff-chest", box: [548, 238, 140], place: "Left chest", size: "5.4″ × 1.6″" },
      back: { art: "teeoff-back", box: [340, 190, 320], place: "Full back", size: "12.3″ × 7.5″" },
    },
  },
  {
    id: "toast-tee",
    name: "Cheers to You Tee",
    garment: "tee",
    collection: "events",
    colour: "natural",
    cardView: "front",
    blurb: "For A Toast to TEAL, the spring survivorship celebration.",
    prints: {
      front: { art: "toast", box: [348, 250, 304], place: "Full front", size: "11.7″ × 3.6″" },
      back: { art: "badge", box: [462, 150, 76], place: "Back neck", size: "2.9″ × 2.9″" },
    },
  },
  {
    id: "carrie-tote",
    name: "Sue's Gift Carrie Tote",
    garment: "carrie",
    collection: "everyday",
    colour: "cream",
    cardView: "front",
    blurb: "Heavyweight canvas with the round mark and wordmark on the front, the heart on the back.",
    prints: {
      front: { art: "tote", box: [350, 540, 300], place: "Front", size: "9.1″ × 5.7″" },
      back: { art: "heart", box: [400, 600, 200], place: "Back", size: "6.1″ × 3.5″" },
    },
  },
];

/** What one side of a product looks like in a colour: the garment template,
 *  its colours, and the print with the artwork that colour takes. */
export function garmentLook(product, colourId, side) {
  const garment = garmentOf(product);
  const colour = colourOf(product, colourId) ?? garment.colours[0];
  const print = product.prints[side];
  const light = isLightGarment(colour.hex);
  return {
    template: garment.views[side],
    body: colour.hex,
    trim: colour.trim ?? null,
    heather: Boolean(colour.heather),
    prints: print ? [{ art: light ? print.art : `${print.art}-white`, box: print.box }] : [],
  };
}

export const COLLECTIONS = {
  all: "Everything",
  events: "Event shirts",
  tees: "Tees",
  totes: "Totes",
};

export function productsIn(collection) {
  if (collection === "tees") return PRODUCTS.filter((p) => GARMENTS[p.garment].kind === "tee");
  if (collection === "totes") return PRODUCTS.filter((p) => GARMENTS[p.garment].kind === "tote");
  if (collection === "events") return PRODUCTS.filter((p) => p.collection === "events");
  return PRODUCTS;
}

export function productById(id) {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

export function garmentOf(product) {
  return GARMENTS[product.garment];
}

export function colourOf(product, colourId) {
  const list = garmentOf(product).colours;
  return list.find((c) => c.id === colourId) ?? null;
}

export const MAX_QUANTITY = 99;
export const MAX_LINES = 30;

/** Price of one of `product` in `size`, in cents. */
export function unitPriceCents(product, size = "") {
  const base = PRICE_CENTS[product.garment];
  if (base === undefined) throw new Error(`no price for ${product.garment}`);
  return base + (garmentOf(product).kind === "tee" ? SIZE_UPCHARGE_CENTS[size] ?? 0 : 0);
}

/** Lowest and highest price a product sells at, across its sizes. */
export function priceRange(product) {
  const prices = garmentOf(product).sizes.map((size) => unitPriceCents(product, size));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** "$8", or "$7.50" for an amount with cents. */
export function usd(cents) {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

// ── Delivery ───────────────────────────────────────────────────────────────

const { handlingCents: HANDLING, firstCents: FIRST, eachAdditionalCents: EACH, maxCents: MAX } = STORE.shipping;
export const SHIPPING_RULE_TEXT = `a ${usd(HANDLING)} handling fee plus ${usd(FIRST)} for the first item and ${usd(EACH)} for each additional item, up to ${usd(HANDLING + MAX)} an order`;
export const SHIPPING_RULE_SHORT = `${usd(HANDLING)} handling + ${usd(FIRST)} first item + ${usd(EACH)} each extra · max ${usd(HANDLING + MAX)}`;

/** How an order reaches the buyer. A sample ships to the door only (Alex,
 *  2026-11-27): store or event pickup is added for a real store when the
 *  nonprofit wants to hand garments out itself. */
export const DELIVERY = {
  ship: {
    label: "Ship to my door",
    short: SHIPPING_RULE_SHORT,
    sentence: `Every order ships straight to the supporter. Shipping is ${SHIPPING_RULE_TEXT}, to U.S. addresses.`,
  },
};

/** A delivery the store offers, or shipping for anything else. */
export function deliveryKey(value) {
  return typeof value === "string" && Object.hasOwn(DELIVERY, value) ? value : "ship";
}

/** Shipping and handling for `count` items, in cents. Nothing ships for an
 *  empty bag. */
export function shippingCents(count) {
  return shippingAndHandlingCents(count, STORE.shipping);
}

// ── The bag ────────────────────────────────────────────────────────────────

export function lineKey(productId, colourId, size) {
  return `${productId}:${colourId}:${size}`;
}

/** A bag line as the page stores it, or null when it isn't one this store
 *  sells: an unknown product, a colour or size its garment doesn't come in,
 *  or a quantity outside 1–99. */
export function normaliseLine(line) {
  if (!line || typeof line !== "object") return null;
  const { productId, colour, size, quantity } = line;
  const product = productById(productId);
  if (!product) return null;
  if (typeof colour !== "string" || !colourOf(product, colour)) return null;
  if (typeof size !== "string" || !garmentOf(product).sizes.includes(size)) return null;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return null;
  return { key: lineKey(productId, colour, size), productId, colour, size, quantity };
}

/** Totals for a bag, in cents. Invalid lines are skipped. */
export function bagTotals(lines, delivery) {
  const valid = (Array.isArray(lines) ? lines : []).map(normaliseLine).filter(Boolean);
  const count = valid.reduce((n, l) => n + l.quantity, 0);
  const subtotal = valid.reduce((n, l) => n + l.quantity * unitPriceCents(productById(l.productId), l.size), 0);
  const shipping = delivery === "ship" ? shippingCents(count) : 0;
  return { count, subtotal, shipping, total: subtotal + shipping };
}

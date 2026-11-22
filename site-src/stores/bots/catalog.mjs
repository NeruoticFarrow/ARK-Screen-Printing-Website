// The Best of the Springs store's products, colours, prices and delivery
// options, in one place. The page (app.jsx) shows these and the tests check
// them.
//
// It's a sample for The Gazette to review: the bag works and adds up, but
// nothing can be bought (STORE.sample). When the designs and prices are
// approved, the checkout follows the RMPC store's (../rmpc/README.md).
//
// Amounts are in cents. The handling fee and the shipping rule are every
// store's (../rules.mjs).

import { HANDLING_CENTS, SHIPPING_RULE, shippingAndHandlingCents } from "../rules.mjs";

export const STORE = {
  name: "Best of the Springs Shop",
  client: "The Gazette",
  path: "/bos",
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

/** Two-Tone Carrie Tote 1008: body / straps, all 5 colourways. */
export const TWO_TONE_COLOURS = colours([
  ["Cream / Black", "#FAF4E8", { trim: "#000000" }],
  ["Army / Cream", "#4E4A36", { trim: "#FAF4E8" }],
  ["Navy / Cream", "#1E202C", { trim: "#FAF4E8" }],
  ["Black / Cream", "#000000", { trim: "#FAF4E8" }],
  ["Coal / Black", "#323031", { trim: "#000000" }],
]);

const relativeLuminance = (hex) => {
  const channel = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
};

/** White ink needs a garment it stands out on. Below this contrast (white,
 *  cream, pastels, light greys and yellows) the white lettering prints in the
 *  logo's plum instead. */
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
  twoTone: {
    label: "AS Colour Two-Tone Carrie Tote",
    style: "1008",
    kind: "tote",
    facts: ["Heavyweight cotton canvas", "Contrast shoulder straps", "One large main compartment"],
    sizes: [ONE_SIZE],
    colours: TWO_TONE_COLOURS,
    views: { front: "two-tone", back: "two-tone" },
  },
};

/** What a buyer pays, before sales tax. Sample prices for The Gazette to
 *  confirm. */
export const PRICE_CENTS = { tee: 2999, carrie: 2499, twoTone: 2999 };

/** Added to a tee's price for its size (the bigger blanks cost more). */
export const SIZE_UPCHARGE_CENTS = { "2XL": 300, "3XL": 300, "4XL": 500, "5XL": 500 };

/** Where each print sits, from Alex's proofs. `box` is [left, top, width] on
 *  the garment's 1000px canvas (its height follows the artwork), and `size`
 *  is the print size the proof gives. `art` names a file in images/art/. The
 *  tees' back prints sit about an inch (26px) lower than in the proofs, to
 *  clear the collar (Alex, 2026-11-19). */
export const PRODUCTS = [
  {
    id: "crown-2027-tee",
    name: "Best of the Springs 2027 Tee",
    garment: "tee",
    collection: "2027",
    colour: "berry",
    cardView: "back",
    blurb: "The 2027 Crown on the chest and across the back.",
    prints: {
      front: { art: "logo-2027", box: [536, 224, 132], place: "Left chest", size: "5.1″ × 4.9″" },
      back: { art: "logo-2027", box: [334, 162, 344], place: "Full back", size: "13.3″ × 12.9″" },
    },
  },
  {
    id: "winner-2026-tee",
    name: "2026 Winner Tee",
    garment: "tee",
    collection: "winners",
    colour: "black",
    cardView: "back",
    blurb: "Voted the best in 2026? Wear it: the Winner mark on the chest and across the back.",
    prints: {
      front: { art: "winner-2026", box: [531, 235, 168], place: "Left chest", size: "6.5″ × 3.7″" },
      back: { art: "winner-2026", box: [319, 196, 401], place: "Full back", size: "15.5″ × 8.7″" },
    },
  },
  {
    id: "winner-badge-tee",
    name: "2026 Winner Badge Tee",
    garment: "tee",
    collection: "winners",
    colour: "natural",
    cardView: "back",
    blurb: "The black Winner badge on the chest and big across the back. It reads on every color.",
    prints: {
      front: { art: "winner-badge", box: [543, 250, 153], place: "Left chest", size: "5.9″ × 3.4″" },
      back: { art: "winner-badge", box: [332, 209, 396], place: "Full back", size: "15.3″ × 8.8″" },
    },
  },
  {
    id: "defend-the-crown-tee",
    name: "Defend the Crown Tee",
    garment: "tee",
    collection: "winners",
    colour: "navy",
    cardView: "back",
    blurb: "2026 Winner on the chest, the 2027 Crown across the back. Won it once, going for it again.",
    prints: {
      front: { art: "winner-2026", box: [546, 244, 153], place: "Left chest", size: "5.9″ × 3.3″" },
      back: { art: "logo-2027", box: [334, 162, 344], place: "Full back", size: "13.3″ × 12.9″" },
    },
  },
  {
    id: "carrie-tote",
    name: "Best of the Springs Carrie Tote",
    garment: "carrie",
    collection: "2027",
    colour: "black",
    cardView: "front",
    blurb: "The 2027 logo on the front and the 2026 Winner mark on the back of a heavyweight canvas tote.",
    prints: {
      front: { art: "logo-2027", box: [331, 528, 310], place: "Front", size: "9.5″ × 9.2″" },
      back: { art: "winner-2026", box: [330, 566, 365], place: "Back", size: "11.2″ × 6.3″" },
    },
  },
  {
    id: "two-tone-tote",
    name: "Best of the Springs Two-Tone Tote",
    garment: "twoTone",
    collection: "2027",
    colour: "army-cream",
    cardView: "front",
    blurb: "The 2027 logo on the front and the 2026 Winner mark on the back, with contrast straps.",
    prints: {
      front: { art: "logo-2027", box: [404, 545, 183], place: "Front", size: "5.6″ × 5.5″" },
      back: { art: "winner-2026", box: [389, 590, 222], place: "Back", size: "6.8″ × 3.8″" },
    },
  },
];

/** Artwork that has a light-garment version: the white lettering printed in
 *  plum (tools/art.mjs makes them). */
const LIGHT_VERSIONS = { "logo-2027": "logo-2027-plum", "winner-2026": "winner-2026-plum" };

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
    prints: print ? [{ art: light ? (LIGHT_VERSIONS[print.art] ?? print.art) : print.art, box: print.box }] : [],
  };
}

export const COLLECTIONS = {
  all: "Everything",
  tees: "Tees",
  totes: "Totes",
  winners: "2026 Winners",
};

export function productsIn(collection) {
  if (collection === "tees") return PRODUCTS.filter((p) => GARMENTS[p.garment].kind === "tee");
  if (collection === "totes") return PRODUCTS.filter((p) => GARMENTS[p.garment].kind === "tote");
  if (collection === "winners") return PRODUCTS.filter((p) => p.collection === "winners");
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

/** How an order reaches the buyer, in the order the bag offers them. Store
 *  pickup, event pickup and shipping are every store's options (Alex,
 *  2026-11-18). */
export const DELIVERY = {
  store: {
    label: "Store pickup",
    short: "Free · 4852 Saddle Ridge Dr, Colorado Springs",
    address: "4852 Saddle Ridge Dr, Colorado Springs, CO 80922",
    sentence: "Pick up your order free at ARK Screen Printing, 4852 Saddle Ridge Dr, Colorado Springs, CO 80922. We'll email you when it's ready.",
  },
  event: {
    label: "Event pickup",
    short: "Free · we'll email pickup details",
    sentence: "Pick up your order free at a Best of the Springs event. We'll email you the pickup details before the event.",
  },
  ship: {
    label: "Ship to my door",
    short: SHIPPING_RULE_SHORT,
    sentence: `Shipping is ${SHIPPING_RULE_TEXT}, to U.S. addresses.`,
  },
};

/** A delivery the store offers, or store pickup for anything else. */
export function deliveryKey(value) {
  return typeof value === "string" && Object.hasOwn(DELIVERY, value) ? value : "store";
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

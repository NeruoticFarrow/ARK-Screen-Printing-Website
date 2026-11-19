import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CARRIE_COLOURS, DELIVERY, GARMENTS, PRICE_CENTS, PRODUCTS, SHIPPING_RULE_TEXT, STORE, TEE_COLOURS, TEE_SIZES, TWO_TONE_COLOURS, bagTotals,
  colourOf, deliveryKey, garmentLook, isLightGarment, normaliseLine, priceRange, productById, productsIn, shippingCents, unitPriceCents,
} from "../catalog.mjs";
import { HANDLING_CENTS, SHIPPING_RULE } from "../../rules.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const IMAGES = path.join(HERE, "..", "images");

test("it's a sample: the page says so and takes no orders", () => {
  assert.equal(STORE.sample, true);
  assert.equal(STORE.path, "/best-of-the-springs");
});

test("every colour AS Colour makes: 75 Staple Tee, 23 Carrie Tote, 5 Two-Tone Carrie", () => {
  assert.equal(TEE_COLOURS.length, 75);
  assert.equal(CARRIE_COLOURS.length, 23);
  assert.equal(TWO_TONE_COLOURS.length, 5);
  for (const list of [TEE_COLOURS, CARRIE_COLOURS, TWO_TONE_COLOURS]) {
    assert.equal(new Set(list.map((c) => c.id)).size, list.length, "colour ids are unique");
    for (const c of list) {
      assert.match(c.hex, /^#[0-9A-F]{6}$/, c.name);
      if (c.trim) assert.match(c.trim, /^#[0-9A-F]{6}$/, c.name);
    }
  }
  assert.deepEqual(TWO_TONE_COLOURS.map((c) => c.name), ["Cream / Black", "Army / Cream", "Navy / Cream", "Black / Cream", "Coal / Black"]);
  assert.deepEqual(TEE_COLOURS.filter((c) => c.heather).map((c) => c.name), ["Athletic Heather", "Granite"]);
});

test("six products, one for each of Alex's proofs, each in a colour its garment comes in", () => {
  assert.equal(PRODUCTS.length, 6);
  assert.equal(new Set(PRODUCTS.map((p) => p.id)).size, 6);
  for (const p of PRODUCTS) {
    assert.ok(GARMENTS[p.garment], p.id);
    assert.ok(colourOf(p, p.colour), `${p.id} default colour`);
    for (const side of ["front", "back"]) {
      const print = p.prints[side];
      assert.ok(print, `${p.id} ${side}`);
      const [left, top, width] = print.box;
      assert.ok(left >= 0 && top >= 0 && width > 0 && left + width <= 1000, `${p.id} ${side} box`);
      assert.ok(fs.existsSync(path.join(IMAGES, "art", `${print.art}.webp`)), `${print.art}.webp`);
    }
  }
  assert.equal(productsIn("tees").length, 4);
  assert.equal(productsIn("totes").length, 2);
  assert.equal(productsIn("winners").length, 3);
  assert.equal(productsIn("all").length, 6);
});

test("every garment template the products use is there", () => {
  for (const garment of Object.values(GARMENTS)) {
    for (const view of Object.values(garment.views)) {
      for (const map of ["shade", "sheen"]) assert.ok(fs.existsSync(path.join(IMAGES, "garments", `${view}-${map}.webp`)), `${view}-${map}.webp`);
    }
  }
  assert.ok(fs.existsSync(path.join(IMAGES, "garments", "two-tone-trim.webp")));
  assert.ok(fs.existsSync(path.join(IMAGES, "garments", "label.webp")));
});

test("white lettering turns plum on light garments; the badge never changes", () => {
  for (const name of ["White", "Natural", "Butter", "Pale Pink", "Seafoam", "Bone"]) assert.ok(isLightGarment(TEE_COLOURS.find((c) => c.name === name).hex), name);
  for (const name of ["Black", "Navy", "Berry", "Army", "Charcoal", "Athletic Heather", "Kelly Green"]) assert.ok(!isLightGarment(TEE_COLOURS.find((c) => c.name === name).hex), name);

  const crown = productById("crown-2027-tee");
  assert.equal(garmentLook(crown, "black", "back").prints[0].art, "logo-2027");
  assert.equal(garmentLook(crown, "white", "back").prints[0].art, "logo-2027-plum");
  const badge = productById("winner-badge-tee");
  assert.equal(garmentLook(badge, "white", "back").prints[0].art, "winner-badge");
  const twoTone = productById("two-tone-tote");
  assert.equal(garmentLook(twoTone, "cream-black", "front").prints[0].art, "logo-2027-plum", "a two-tone tote goes by its body colour");
  assert.equal(garmentLook(twoTone, "navy-cream", "front").trim, "#FAF4E8");
});

test("sample prices: tees $29.99 (2XL–3XL +$3, 4XL–5XL +$5), Carrie $24.99, Two-Tone $29.99", () => {
  assert.deepEqual(PRICE_CENTS, { tee: 2999, carrie: 2499, twoTone: 2999 });
  const tee = productById("winner-2026-tee");
  assert.deepEqual(TEE_SIZES.map((s) => unitPriceCents(tee, s)), [2999, 2999, 2999, 2999, 2999, 3299, 3299, 3499, 3499]);
  assert.deepEqual(priceRange(tee), { min: 2999, max: 3499 });
  assert.deepEqual(priceRange(productById("carrie-tote")), { min: 2499, max: 2499 });
  assert.deepEqual(priceRange(productById("two-tone-tote")), { min: 2999, max: 2999 });
});

test("every store's rule: shipped orders pay $4.50 handling, plus $8, then $3 an item, at most $35", () => {
  assert.equal(HANDLING_CENTS, 450);
  assert.deepEqual(SHIPPING_RULE, { firstCents: 800, eachAdditionalCents: 300, maxCents: 3500 });
  assert.equal(shippingCents(0), 0);
  assert.equal(shippingCents(1), 1250);
  assert.equal(shippingCents(2), 1550);
  assert.equal(shippingCents(10), 3950);
  assert.equal(shippingCents(40), 3950);
  assert.equal(SHIPPING_RULE_TEXT, "a $4.50 handling fee plus $8 for the first item and $3 for each additional item, up to $39.50 an order");
});

test("three ways to get an order: store pickup at Saddle Ridge Dr, event pickup, or shipping", () => {
  assert.deepEqual(Object.keys(DELIVERY), ["store", "event", "ship"]);
  assert.equal(DELIVERY.store.address, "4852 Saddle Ridge Dr, Colorado Springs, CO 80922");
  assert.match(DELIVERY.store.sentence, /4852 Saddle Ridge Dr, Colorado Springs, CO 80922/);
  assert.equal(DELIVERY.event.label, "Event pickup");
  assert.equal(deliveryKey("ship"), "ship");
  assert.equal(deliveryKey("event"), "event");
  assert.equal(deliveryKey("drone"), "store");
  assert.equal(deliveryKey("__proto__"), "store");
  assert.equal(deliveryKey(undefined), "store");
});

test("a bag line must be something the store sells", () => {
  const ok = { productId: "crown-2027-tee", colour: "berry", size: "L", quantity: 2 };
  assert.deepEqual(normaliseLine(ok), { ...ok, key: "crown-2027-tee:berry:L" });
  assert.equal(normaliseLine({ ...ok, productId: "nope" }), null);
  assert.equal(normaliseLine({ ...ok, colour: "liberty" }), null, "Liberty is a Carrie colour, not a Staple Tee one");
  assert.equal(normaliseLine({ ...ok, size: "6XL" }), null);
  assert.equal(normaliseLine({ ...ok, size: "One size" }), null);
  assert.equal(normaliseLine({ ...ok, quantity: 0 }), null);
  assert.equal(normaliseLine({ ...ok, quantity: 100 }), null);
  assert.equal(normaliseLine({ ...ok, quantity: 1.5 }), null);
  assert.ok(normaliseLine({ productId: "carrie-tote", colour: "liberty", size: "One size", quantity: 1 }));
  assert.equal(normaliseLine({ productId: "carrie-tote", colour: "liberty", size: "M", quantity: 1 }), null);
  assert.equal(normaliseLine(null), null);
});

test("bag totals: pickup is free, shipping adds handling and shipping", () => {
  const lines = [
    { productId: "crown-2027-tee", colour: "berry", size: "L", quantity: 2 },
    { productId: "winner-2026-tee", colour: "black", size: "3XL", quantity: 1 },
    { productId: "carrie-tote", colour: "black", size: "One size", quantity: 1 },
    { productId: "nope", colour: "black", size: "L", quantity: 5 },
  ];
  assert.deepEqual(bagTotals(lines, "store"), { count: 4, subtotal: 2 * 2999 + 3299 + 2499, shipping: 0, total: 11796 });
  assert.deepEqual(bagTotals(lines, "event"), { count: 4, subtotal: 11796, shipping: 0, total: 11796 });
  assert.deepEqual(bagTotals(lines, "ship"), { count: 4, subtotal: 11796, shipping: 450 + 800 + 3 * 300, total: 11796 + 2150 });
  assert.deepEqual(bagTotals([], "ship"), { count: 0, subtotal: 0, shipping: 0, total: 0 });
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CARRIE_COLOURS, DELIVERY, GARMENTS, PRICE_CENTS, PRODUCTS, ROBOTS, STORE, TEE_COLOURS, TEE_SIZES, bagTotals,
  colourOf, deliveryKey, garmentLook, isLightGarment, normaliseLine, priceRange, productById, productsIn, unitPriceCents,
} from "../catalog.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const IMAGES = path.join(HERE, "..", "images");

test("it's a sample at /suesgift", () => {
  assert.equal(STORE.sample, true);
  assert.equal(STORE.path, "/suesgift");
});

test("a sample stays out of search and credits ARK in the footer", () => {
  assert.equal(STORE.indexable, false);
  assert.equal(ROBOTS, "noindex, nofollow");
  assert.equal(STORE.credit.href, "https://arkscreenprinting.com");
});

test("every AS Colour colour: 75 Staple Tee, 23 Carrie Tote", () => {
  assert.equal(TEE_COLOURS.length, 75);
  assert.equal(CARRIE_COLOURS.length, 23);
});

test("six products, each in a colour its garment comes in, with both art versions on disk", () => {
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
      for (const name of [print.art, `${print.art}-white`]) assert.ok(fs.existsSync(path.join(IMAGES, "art", `${name}.webp`)), `${name}.webp`);
    }
  }
  assert.equal(productsIn("tees").length, 5);
  assert.equal(productsIn("totes").length, 1);
  assert.equal(productsIn("events").length, 3);
  assert.equal(productsIn("all").length, 6);
});

test("every garment template the products use is there", () => {
  for (const garment of Object.values(GARMENTS)) {
    for (const view of Object.values(garment.views)) {
      for (const map of ["shade", "sheen"]) assert.ok(fs.existsSync(path.join(IMAGES, "garments", `${view}-${map}.webp`)), `${view}-${map}.webp`);
    }
  }
});

test("teal print on light garments, one-colour white on dark ones", () => {
  const tee = productById("not-alone-tee");
  assert.ok(isLightGarment(TEE_COLOURS.find((c) => c.name === "White").hex));
  assert.ok(!isLightGarment(TEE_COLOURS.find((c) => c.name === "Black").hex));
  assert.equal(garmentLook(tee, "white", "back").prints[0].art, "not-alone");
  assert.equal(garmentLook(tee, "black", "back").prints[0].art, "not-alone-white");
});

test("sample prices: tees $29.99 (2XL–3XL +$3, 4XL–5XL +$5), Carrie $24.99", () => {
  assert.deepEqual(PRICE_CENTS, { tee: 2999, carrie: 2499 });
  const tee = productById("logo-tee");
  assert.deepEqual(TEE_SIZES.map((s) => unitPriceCents(tee, s)), [2999, 2999, 2999, 2999, 2999, 3299, 3299, 3499, 3499]);
  assert.deepEqual(priceRange(productById("carrie-tote")), { min: 2499, max: 2499 });
});

test("samples ship to the door only: no store or event pickup", () => {
  assert.deepEqual(Object.keys(DELIVERY), ["ship"]);
  assert.equal(deliveryKey("store"), "ship");
  assert.equal(deliveryKey("event"), "ship");
  assert.equal(deliveryKey("__proto__"), "ship");
  assert.equal(deliveryKey(undefined), "ship");
});

test("a bag line must be something the store sells, and shipping is added", () => {
  const ok = { productId: "logo-tee", colour: "white", size: "L", quantity: 2 };
  assert.deepEqual(normaliseLine(ok), { ...ok, key: "logo-tee:white:L" });
  assert.equal(normaliseLine({ ...ok, productId: "nope" }), null);
  assert.equal(normaliseLine({ ...ok, size: "6XL" }), null);
  assert.equal(normaliseLine({ ...ok, quantity: 0 }), null);
  const lines = [ok, { productId: "carrie-tote", colour: "cream", size: "One size", quantity: 1 }];
  assert.deepEqual(bagTotals(lines, "ship"), { count: 3, subtotal: 2 * 2999 + 2499, shipping: 450 + 800 + 2 * 300, total: 8497 + 1850 });
});

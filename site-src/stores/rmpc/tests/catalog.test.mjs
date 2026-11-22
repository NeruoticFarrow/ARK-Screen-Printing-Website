import assert from "node:assert/strict";
import test from "node:test";
import {
  DELIVERY, GARMENTS, PRICE_CENTS, PRODUCTS, SHIPPING_RULE_TEXT, SIZE_UPCHARGE_CENTS, bagTotals, decodeItems, deliveryKey, encodeItems,
  normaliseLine, orderRef, priceOrder, priceRange, shippingCents, sizesFor, unitPriceCents,
} from "../catalog.mjs";
import { HANDLING_CENTS, SHIPPING_RULE, shippingAndHandlingCents } from "../../rules.mjs";

test("the client's prices: every tee $29.99, every crewneck $59.99, every size the same", () => {
  assert.equal(PRICE_CENTS.tee, 2999);
  assert.equal(PRICE_CENTS.crew, 5999);
  for (const [variant, garment] of Object.entries(GARMENTS)) {
    for (const size of sizesFor(garment.type, garment.fit)) {
      assert.equal(unitPriceCents(variant, size), garment.type === "tee" ? 2999 : 5999, `${variant} ${size}`);
    }
  }
  assert.equal(SIZE_UPCHARGE_CENTS["2XL"], 0);
  for (const product of PRODUCTS) {
    const range = priceRange(product);
    assert.equal(range.min, range.max, product.id);
  }
});

test("every store's rule: shipped orders pay $4.50 handling, plus $8, then $3 a garment, at most $35", () => {
  assert.equal(HANDLING_CENTS, 450);
  assert.deepEqual(SHIPPING_RULE, { firstCents: 800, eachAdditionalCents: 300, maxCents: 3500 });
  assert.equal(shippingAndHandlingCents(0), 0, "nothing ships for an empty bag");
  assert.equal(shippingAndHandlingCents(1), 1250);
  assert.equal(shippingAndHandlingCents(10), 3950);
});

test("RMPC ships by that rule", () => {
  assert.equal(shippingCents(0), 0);
  assert.equal(shippingCents(1), 1250);
  assert.equal(shippingCents(2), 1550);
  assert.equal(shippingCents(10), 3950);
  assert.equal(shippingCents(40), 3950);
  assert.equal(SHIPPING_RULE_TEXT, "a $4.50 handling fee plus $8 for the first garment and $3 for each additional garment, up to $39.50 an order");
});

test("three ways to get an order: event pickup, store pickup at Saddle Ridge Dr, or shipping", () => {
  assert.deepEqual(Object.keys(DELIVERY), ["pickup", "store", "ship"]);
  assert.equal(DELIVERY.pickup.label, "Event pickup", "\"pickup\" stays event pickup, as earlier orders recorded it");
  assert.equal(DELIVERY.store.label, "Store pickup");
  assert.equal(DELIVERY.store.address, "4852 Saddle Ridge Dr, Colorado Springs, CO 80922");
  assert.match(DELIVERY.store.sentence, /4852 Saddle Ridge Dr, Colorado Springs, CO 80922/);
  assert.equal(deliveryKey("store"), "store");
  assert.equal(deliveryKey("ship"), "ship");
  assert.equal(deliveryKey("drone"), "pickup");
  assert.equal(deliveryKey("__proto__"), "pickup");
  assert.equal(deliveryKey(undefined), "pickup");
});

test("a bag line must be something the store sells", () => {
  const ok = { productId: "wordmark-tee", variant: "gildan-youth", size: "XS", quantity: 1 };
  assert.deepEqual(normaliseLine(ok), { ...ok, key: "wordmark-tee:gildan-youth:XS" });
  assert.equal(normaliseLine({ ...ok, productId: "nope" }), null);
  assert.equal(normaliseLine({ ...ok, variant: "independent-adult" }), null, "a crewneck garment on a tee");
  assert.equal(normaliseLine({ productId: "wordmark-crew", variant: "independent-youth", size: "XS", quantity: 1 }), null, "youth crewnecks start at S");
  assert.equal(normaliseLine({ ...ok, variant: "gildan-adult", size: "3XL" }), null, "adults stop at 2XL");
  assert.equal(normaliseLine({ ...ok, quantity: 0 }), null);
  assert.equal(normaliseLine({ ...ok, quantity: 100 }), null);
  assert.equal(normaliseLine({ ...ok, quantity: 1.5 }), null);
  assert.equal(normaliseLine({ ...ok, variant: "__proto__" }), null);
});

test("priceOrder re-prices from the catalogue and ignores anything priced by the browser", () => {
  const order = priceOrder({
    delivery: "ship",
    lines: [
      { productId: "wordmark-tee", variant: "gildan-adult", size: "L", quantity: 2, unitCents: 1, price: 0.01 },
      { productId: "athlete-crew", variant: "independent-adult", size: "2XL", quantity: 1 },
      { productId: "wordmark-tee", variant: "gildan-adult", size: "L", quantity: 1 },
    ],
  });
  assert.equal(order.ok, true);
  assert.equal(order.lines.length, 2, "the same item twice is merged");
  assert.deepEqual(order.lines.map((l) => [l.quantity, l.unitCents, l.totalCents]), [[3, 2999, 8997], [1, 5999, 5999]]);
  assert.equal(order.lines[0].detail, "Gildan 5000 · Adult · L · Black");
  assert.equal(order.count, 4);
  assert.equal(order.subtotalCents, 14996);
  assert.equal(order.shippingCents, 2150, "$4.50 handling + $8 + 3 × $3");
  for (const delivery of ["pickup", "store"]) {
    const pickup = priceOrder({ delivery, lines: [{ productId: "wordmark-tee", variant: "gildan-adult", size: "L", quantity: 1 }] });
    assert.equal(pickup.ok, true, delivery);
    assert.equal(pickup.delivery, delivery);
    assert.equal(pickup.shippingCents, 0, `${delivery} is free`);
  }
});

test("priceOrder refuses what it can't sell, with a reason", () => {
  assert.match(priceOrder({ delivery: "drone", lines: [] }).error, /event pickup, store pickup or shipping/);
  assert.match(priceOrder({ delivery: "__proto__", lines: [] }).error, /event pickup, store pickup or shipping/);
  assert.match(priceOrder({ delivery: "pickup", lines: [] }).error, /empty/);
  assert.match(priceOrder({ delivery: "pickup", lines: [{ productId: "x" }] }).error, /isn't available/);
  const line = { productId: "wordmark-tee", variant: "gildan-adult", size: "L", quantity: 60 };
  assert.match(priceOrder({ delivery: "pickup", lines: [line, line] }).error, /up to 99/);
  const many = Array.from({ length: 31 }, () => ({ ...line, quantity: 1 }));
  assert.match(priceOrder({ delivery: "pickup", lines: many }).error, /up to 30/);
});

test("bag totals match what the checkout charges", () => {
  const lines = [
    { productId: "athlete-tee", variant: "next-level-youth", size: "S", quantity: 2 },
    { productId: "wordmark-crew", variant: "independent-youth", size: "M", quantity: 1 },
  ];
  const totals = bagTotals(lines, "ship");
  const order = priceOrder({ delivery: "ship", lines });
  assert.deepEqual(totals, { count: 3, subtotal: order.subtotalCents, shipping: order.shippingCents, total: order.subtotalCents + order.shippingCents });
});

test("order lines survive the trip through Stripe metadata, in 500-character values", () => {
  const lines = Object.keys(GARMENTS).flatMap((variant) => {
    const g = GARMENTS[variant];
    const productId = g.type === "tee" ? "athlete-tee" : "athlete-crew";
    return sizesFor(g.type, g.fit).map((size) => ({ productId, variant, size, quantity: 99, unitCents: unitPriceCents(variant, size) }));
  });
  assert.ok(lines.length >= 28);
  const metadata = encodeItems(lines);
  assert.ok(Object.keys(metadata).length > 1, "spreads across keys");
  for (const value of Object.values(metadata)) assert.ok(value.length <= 500);
  assert.deepEqual(decodeItems({ channel: "rmpc-store", ...metadata }), lines.map(({ productId, variant, size, quantity, unitCents }) => ({ productId, variant, size, quantity, unitCents })));
});

test("an order reference is the session id's last eight characters", () => {
  assert.equal(orderRef("cs_test_a1B2c3D4e5F6g7H8"), "E5F6G7H8");
  assert.equal(orderRef(null), "");
});

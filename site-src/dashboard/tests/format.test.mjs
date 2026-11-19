import assert from "node:assert/strict";
import test from "node:test";
import { byBuyer, matchesOrder, orderTime, paidDay, plural, printGrids, runNote, runProgress, todayYmd, usd, usdShort } from "../format.mjs";

const order = (over = {}) => ({
  ref: "A1B2C3", created: 1_799_000_000, status: "Paid",
  buyer: { name: "Zoë Álvarez", email: "zoe@example.com" },
  delivery: { kind: "ship", label: "Shipping", place: "Pueblo, CO" },
  items: [{ product: "RMPC Athlete Tee", front: "Athlete graphic", garment: "Gildan 5000", fit: "Adult", size: "XL" }],
  ...over,
});

test("money reads as dollars", () => {
  assert.equal(usd(123456), "$1,234.56");
  assert.equal(usd(0), "$0.00");
  assert.equal(usd(-1050), "−$10.50");
  assert.equal(usdShort(500000), "$5,000");
  assert.equal(usdShort(500050), "$5,000.50");
  assert.equal(plural(1, "order"), "1 order");
  assert.equal(plural(1200, "garment"), "1,200 garments");
});

test("times are Colorado's", () => {
  assert.equal(orderTime(Date.parse("2026-12-02T04:30:00Z") / 1000), "Dec 1, 9:30 PM");
  assert.equal(paidDay("2026-12-05"), "Dec 5, 2026");
  assert.equal(todayYmd(Date.parse("2026-12-02T04:30:00Z")), "2026-12-01");
});

test("search matches every word, ignoring case and accents", () => {
  assert.ok(matchesOrder(order(), ""));
  assert.ok(matchesOrder(order(), "zoe"));
  assert.ok(matchesOrder(order(), "alvarez athlete xl"));
  assert.ok(matchesOrder(order(), "a1b2"));
  assert.ok(matchesOrder(order(), "pueblo"));
  assert.ok(!matchesOrder(order(), "zoe crewneck"));
  assert.deepEqual(byBuyer([order({ ref: "2", buyer: { name: "bo", email: "" } }), order({ ref: "1", buyer: { name: "Al", email: "" } })]).map((o) => o.ref), ["1", "2"]);
});

test("print counts become one grid per product, sizes in order", () => {
  const grids = printGrids([
    { product: "Tee", front: "Wordmark", colour: "Black", garment: "Gildan 5000", fit: "Adult", size: "2XL", quantity: 1 },
    { product: "Tee", front: "Wordmark", colour: "Black", garment: "Gildan 5000", fit: "Adult", size: "M", quantity: 3 },
    { product: "Tee", front: "Wordmark", colour: "Black", garment: "Gildan 5000B", fit: "Youth", size: "XS", quantity: 2 },
    { product: "Crew", front: "Athlete", colour: "Black", garment: "SS3000", fit: "Adult", size: "L", quantity: 4 },
  ]);
  assert.deepEqual(grids.map((g) => [g.product, g.sizes, g.total]), [["Tee", ["XS", "M", "2XL"], 6], ["Crew", ["L"], 4]]);
  assert.deepEqual(grids[0].rows.map((r) => [r.garment, r.sizes, r.total]), [["Gildan 5000", { "2XL": 1, M: 3 }, 4], ["Gildan 5000B", { XS: 2 }, 2]]);
  assert.deepEqual(grids[0].columnTotals, { XS: 2, M: 3, "2XL": 1 });
});

test("print runs say how far the next price is", () => {
  const tiers = [25, 50, 100];
  assert.equal(runNote({ garments: 18, tier: 25, next: { at: 50, more: 32 } }), "At the 25-piece price. 32 more garments reach the 50-piece price.");
  assert.equal(runNote({ garments: 99, tier: 50, next: { at: 100, more: 1 } }), "At the 50-piece price. 1 more garment reaches the 100-piece price.");
  assert.equal(runNote({ garments: 140, tier: 100, next: null }), "At the 100-piece price, the lowest on the quote.");
  assert.equal(runProgress({ garments: 30, tier: 25, next: { at: 50, more: 20 } }, tiers), 0.6);
  assert.equal(runProgress({ garments: 75, tier: 50, next: { at: 100, more: 25 } }, tiers), 0.5);
  assert.equal(runProgress({ garments: 120, tier: 100, next: null }, tiers), 1);
});

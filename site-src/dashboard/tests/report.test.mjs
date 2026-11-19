import assert from "node:assert/strict";
import test from "node:test";
import { toOrder } from "../../../netlify/functions/rmpc-orders.mjs";
import { clientOrder, clientOrdersCsv, costSheetInDollars, nextBreak, parseCostSheet, paymentsSummary, printCountsCsv, profitReport, tierFor, toCents, totals, unitCost } from "../../../netlify/lib/dashboard/report.mjs";
import { storeById } from "../../../netlify/lib/dashboard/stores.mjs";
import { SHEET_DOLLARS, session } from "./fixtures.mjs";

const rmpc = storeById("rmpc");
const orders = (...sessions) => sessions.map((s) => clientOrder(rmpc, toOrder(s)));
const sheet = () => {
  const parsed = parseCostSheet(rmpc.costing, SHEET_DOLLARS);
  assert.equal(parsed.ok, true, parsed.error);
  return parsed.sheet;
};

test("a client sees the buyer's name, email and town, never the street or phone", () => {
  const [o] = orders(session({ delivery: "ship", name: "Riley Park", email: "riley@example.com", city: "Pueblo", state: "CO" }));
  assert.deepEqual(o.buyer, { name: "Riley Park", email: "riley@example.com" });
  assert.deepEqual(o.delivery, { kind: "ship", label: "Shipping", place: "Pueblo, CO" });
  const text = JSON.stringify(o);
  assert.doesNotMatch(text, /Secret Street|81003|5550100/);
  assert.doesNotMatch(clientOrdersCsv([o]), /Secret Street|81003|5550100|Phone/);
});

test("RMPC's three deliveries are event pickup, store pickup and shipping", () => {
  const list = orders(session({ delivery: "pickup" }), session({ delivery: "store" }), session({ delivery: "ship" }), session({ delivery: "ship" }));
  assert.deepEqual(list.map((o) => o.delivery.label), ["Event pickup", "Store pickup", "Shipping", "Shipping"]);
  assert.equal(list[0].delivery.place, "", "a pickup has no town");
  assert.deepEqual(totals(list).byDelivery, { event: 1, store: 1, ship: 2 });
});

test("totals leave a fully refunded order out but still show its refund", () => {
  const list = orders(
    session({ lines: [["wordmark-tee", "gildan-adult", "M", 2, 2999]], delivery: "ship", tax: 300 }),
    session({ lines: [["athlete-crew", "independent-adult", "L", 1, 5999]], refunded: 5999 }),
  );
  assert.deepEqual(list.map((o) => o.status), ["Paid", "Refunded"]);
  const t = totals(list);
  assert.equal(t.orders, 1);
  assert.equal(t.garments, 2);
  assert.equal(t.salesCents, 5998);
  assert.equal(t.shippingCents, 1250);
  assert.equal(t.taxCents, 300);
  assert.equal(t.refundedCents, 5999);
});

test("a run's price is the biggest break it has reached; under the second break it's the first", () => {
  const tiers = rmpc.costing.tiers;
  assert.deepEqual(tiers, [25, 50, 100]);
  assert.equal(tierFor(tiers, 0), 25);
  assert.equal(tierFor(tiers, 24), 25);
  assert.equal(tierFor(tiers, 49), 25);
  assert.equal(tierFor(tiers, 50), 50);
  assert.equal(tierFor(tiers, 99), 50);
  assert.equal(tierFor(tiers, 100), 100);
  assert.equal(tierFor(tiers, 400), 100);
  assert.deepEqual(nextBreak(tiers, 10), { at: 50, more: 40 });
  assert.deepEqual(nextBreak(tiers, 50), { at: 100, more: 50 });
  assert.equal(nextBreak(tiers, 100), null);
});

test("ARK's price adds the upcharge to adult 2XL only", () => {
  const s = sheet();
  assert.equal(unitCost(rmpc.costing, s, "athlete", "gildan-adult", 25, "XL"), 2000);
  assert.equal(unitCost(rmpc.costing, s, "athlete", "gildan-adult", 25, "2XL"), 2200);
  assert.equal(unitCost(rmpc.costing, s, "athlete", "independent-adult", 100, "2XL"), 3300);
  assert.equal(unitCost(rmpc.costing, s, "athlete", "gildan-youth", 50, "XL"), 1400);
  assert.equal(unitCost(rmpc.costing, s, "wordmark", "gildan-adult", 50, "2XL"), 1400, "the sheet's \"2XL\" column is the upcharge");
  assert.equal(unitCost(rmpc.costing, null, "athlete", "gildan-adult", 25, "M"), null);
});

test("the design groups follow the catalogue's front prints", () => {
  const groups = Object.fromEntries(rmpc.costing.groups.map((g) => [g.id, g.products]));
  assert.deepEqual(groups, { athlete: ["athlete-tee", "athlete-crew"], wordmark: ["wordmark-tee", "wordmark-crew"] });
});

test("profit is sales less ARK's price at the run size, tees and crews sharing a run", () => {
  // 40 athlete tees + 10 athlete crews = a 50-piece athlete run; 5 wordmark tees stay at the 25 price.
  const list = orders(
    session({ lines: [["athlete-tee", "gildan-adult", "L", 40, 2999]] }),
    session({ lines: [["athlete-crew", "independent-youth", "M", 10, 5999]] }),
    session({ lines: [["wordmark-tee", "next-level-adult", "2XL", 5, 2999]] }),
  );
  const report = profitReport(rmpc, list, sheet());
  assert.equal(report.ready, true);
  assert.equal(report.complete, true);
  assert.deepEqual(report.groups.map((g) => [g.id, g.garments, g.tier, g.next]), [
    ["athlete", 50, 50, { at: 100, more: 50 }],
    ["wordmark", 5, 25, { at: 50, more: 45 }],
  ]);
  const line = (productId) => report.lines.find((l) => l.productId === productId);
  assert.equal(line("athlete-tee").costCents, 40 * 1500);
  assert.equal(line("athlete-crew").costCents, 10 * 3000);
  assert.equal(line("wordmark-tee").costCents, 5 * (1800 + 150), "adult 2XL adds the upcharge");
  assert.equal(line("athlete-tee").profitCents, 40 * (2999 - 1500));
  const sales = 40 * 2999 + 10 * 5999 + 5 * 2999;
  const cost = 40 * 1500 + 10 * 3000 + 5 * 1950;
  assert.deepEqual(report.totals, { salesCents: sales, costCents: cost, refundsCents: 0, profitCents: sales - cost });
  assert.deepEqual(report.lines.map((l) => l.productId), ["wordmark-tee", "athlete-tee", "athlete-crew"], "in catalogue order");
});

test("one more garment can drop the whole run to the next price", () => {
  const at49 = profitReport(rmpc, orders(session({ lines: [["athlete-tee", "gildan-youth", "S", 49, 2999]] })), sheet());
  const at50 = profitReport(rmpc, orders(session({ lines: [["athlete-tee", "gildan-youth", "S", 49, 2999]] }), session({ lines: [["athlete-crew", "independent-adult", "M", 1, 5999]] })), sheet());
  assert.equal(at49.totals.costCents, 49 * 1900);
  assert.equal(at50.totals.costCents, 49 * 1400 + 3500);
});

test("refunds: a full refund drops the order, a partial one comes off profit, capped at its garments", () => {
  const list = orders(
    session({ lines: [["wordmark-tee", "gildan-adult", "M", 2, 2999]] }),
    session({ lines: [["wordmark-tee", "gildan-adult", "L", 1, 2999]], refunded: 2999 }),
    session({ lines: [["wordmark-tee", "gildan-adult", "S", 1, 2999]], refunded: 1000 }),
    session({ lines: [["wordmark-tee", "gildan-adult", "S", 1, 2999]], delivery: "ship", refunded: 3500 }),
  );
  assert.deepEqual(list.map((o) => o.status), ["Paid", "Refunded", "Partly refunded", "Partly refunded"]);
  const report = profitReport(rmpc, list, sheet());
  assert.equal(report.groups.find((g) => g.id === "wordmark").garments, 4, "the fully refunded tee isn't printed");
  assert.equal(report.totals.salesCents, 4 * 2999);
  assert.equal(report.totals.costCents, 4 * 1600);
  assert.equal(report.totals.refundsCents, 1000 + 2999, "the shipped order's refund counts only up to its garments");
  assert.equal(report.totals.profitCents, 4 * 2999 - 4 * 1600 - 3999);
});

test("without a cost sheet profit isn't ready; a missing cell marks it incomplete", () => {
  const list = orders(session({ lines: [["athlete-tee", "gildan-adult", "M", 3, 2999], ["wordmark-crew", "independent-youth", "S", 1, 5999]] }));
  const none = profitReport(rmpc, list, null);
  assert.equal(none.ready, false);
  assert.equal(none.complete, false);
  const partial = parseCostSheet(rmpc.costing, { athlete: SHEET_DOLLARS.athlete });
  const report = profitReport(rmpc, list, partial.sheet);
  assert.equal(report.ready, true);
  assert.equal(report.complete, false);
  assert.deepEqual(report.missing, [{ group: "Team wordmark", blank: "Independent SS3001Y, youth" }]);
  assert.equal(report.lines.find((l) => l.productId === "wordmark-crew").priced, false);
});

test("cost sheets read dollars and name the first bad cell", () => {
  assert.equal(toCents("12.34"), 1234);
  assert.equal(toCents("$12.34"), 1234);
  assert.equal(toCents(" +2.5 "), 250);
  assert.equal(toCents(21), 2100);
  assert.equal(toCents(10.07), 1007);
  assert.equal(toCents(""), null);
  assert.equal(toCents("—"), null);
  assert.ok(Number.isNaN(toCents("twenty")));
  assert.ok(Number.isNaN(toCents("12.345")));
  assert.ok(Number.isNaN(toCents(-1)));

  const s = sheet();
  assert.deepEqual(s.groups.wordmark["gildan-adult"], { 25: 1600, 50: 1200, 100: 800, upcharge: 200 });
  assert.deepEqual(s.groups.wordmark["gildan-youth"], { 25: 1500, 50: 1100, 100: 700 });
  assert.deepEqual(parseCostSheet(rmpc.costing, { groups: SHEET_DOLLARS }), { ok: true, sheet: s }, "a { groups } wrapper is fine too");

  assert.match(parseCostSheet(rmpc.costing, { athlete: { "gildan-adult": { 25: "abc" } } }).error, /Athlete graphic, Gildan 5000, adult: the 25-piece price/);
  assert.match(parseCostSheet(rmpc.costing, { crown: {} }).error, /no design group "crown"/);
  assert.match(parseCostSheet(rmpc.costing, { athlete: { "bella-canvas": {} } }).error, /no blank "bella-canvas"/);
  assert.equal(parseCostSheet(rmpc.costing, "nope").ok, false);
  assert.equal(parseCostSheet(rmpc.costing, [1, 2]).ok, false);
});

test("a saved sheet reads back in dollars, ready to parse again", () => {
  const dollars = costSheetInDollars(rmpc.costing, sheet());
  assert.deepEqual(dollars.athlete["gildan-adult"], { 25: "20.00", 50: "15.00", 100: "10.00", upcharge: "2.00" });
  assert.deepEqual(dollars.athlete["gildan-youth"], { 25: "19.00", 50: "14.00", 100: "9.00" });
  assert.deepEqual(parseCostSheet(rmpc.costing, dollars).sheet, sheet());
});

test("payments: newest first, and never more than the profit owed", () => {
  const list = [
    { id: "a", date: "2026-12-01", amountCents: 10000, recordedAt: 1 },
    { id: "b", date: "2027-01-15", amountCents: 5000, recordedAt: 2 },
  ];
  const summary = paymentsSummary(list, 12000);
  assert.deepEqual(summary.list.map((p) => p.id), ["b", "a"]);
  assert.equal(summary.paidCents, 15000);
  assert.equal(summary.owedCents, 0);
  assert.equal(paymentsSummary(undefined, 2500).owedCents, 2500);
});

test("the spreadsheets: one row per garment line, order money once, formulas defused", () => {
  const list = orders(session({ name: "=HYPERLINK(1)", lines: [["wordmark-tee", "gildan-adult", "M", 2, 2999], ["athlete-crew", "independent-youth", "L", 1, 5999]], tax: 500 }));
  const rows = clientOrdersCsv(list).trim().split("\r\n");
  assert.equal(rows.length, 3);
  assert.match(rows[0], /^Order,Date \(Mountain\),Status,Name,Email,Delivery,Ships to,Product/);
  assert.match(rows[1], /,'=HYPERLINK\(1\),/, "a name can't run as a formula");
  assert.match(rows[1], /,119\.97,0\.00,5\.00,124\.97,0\.00$/);
  assert.match(rows[2], /,,,,,$/, "order money only on the first line");
  const counts = rmpc.printCounts(list);
  assert.deepEqual(counts.map((c) => [c.product, c.garment, c.fit, c.size, c.quantity]), [
    ["RMPC Team Tee", "Gildan 5000", "Adult", "M", 2],
    ["RMPC Athlete Crewneck", "Independent SS3001Y", "Youth", "L", 1],
  ]);
  assert.match(printCountsCsv(counts), /\r\nTotal,,,,,,3\r\n$/);
});

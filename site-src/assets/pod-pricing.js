// Print on demand: the Studio's price arithmetic, for the calculator on
// /print-on-demand (owner, 2026-10-17: "show our true pricing … use the quote
// form calculations … give people the ability to toy with that calculator").
// A plain-script copy of ark-designer shared/creatorPricing.ts (rule models v2
// and v3) working from the rules the price feed publishes. Built into
// assets/site.js and run at build time for the page's worked example; the
// build checks it against the bases the Studio itself worked out for the
// feed's examples (check.mjs), so the two can't drift apart.
var podPricing = (function () {
  "use strict";

  // shared/creatorPricing.ts roundCurrency.
  function round(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function extraLocations(locations) {
    return Math.max(0, locations.length - 1);
  }

  // One transfer's film at the shared gang-sheet rate: the cheapest sheet per
  // transfer, laid out tight with rotation allowed, marked up.
  function transferCost(dtf, location) {
    var clamp = function (v, max) { return !isFinite(v) || v <= 0 ? dtf.minIn : Math.min(Math.max(v, dtf.minIn), max); };
    var width = clamp(location.widthIn, dtf.maxWidthIn);
    var height = clamp(location.heightIn, dtf.maxHeightIn);
    var best = Infinity;
    dtf.gangSheets.forEach(function (sheet) {
      [[width, height], [height, width]].forEach(function (layout) {
        var perSheet = Math.floor(sheet.widthIn / layout[0]) * Math.floor(sheet.lengthIn / layout[1]);
        if (perSheet >= 1) best = Math.min(best, (sheet.rawCost * dtf.materialMarkupMultiplier) / perSheet);
      });
    });
    return isFinite(best) ? best : 0;
  }

  // DTF per garment: the film, a press per location, the extra-location fee.
  function dtfPrint(rules, locations) {
    var film = locations.reduce(function (sum, l) { return sum + transferCost(rules.dtf, l); }, 0);
    return film + rules.dtf.pressFeePerLocation * locations.length + rules.dtf.extraLocationFee * extraLocations(locations);
  }

  function locationScreens(screen, location) {
    return Math.min(Math.max(1, location.colours), screen.maxColours);
  }

  function impressionCost(screen, screens) {
    var remaining = screens;
    var covered = 0;
    var cost = 0;
    for (var i = 0; i < screen.impressionRates.length; i += 1) {
      var tier = screen.impressionRates[i];
      var upTo = tier.upToColours === undefined ? Infinity : tier.upToColours;
      var inTier = Math.max(0, Math.min(remaining, upTo - covered));
      cost += inTier * tier.rate;
      remaining -= inTier;
      covered = upTo;
      if (remaining <= 0) break;
    }
    return cost;
  }

  // The quote form's bulk tier a run reaches, or null.
  function bulkTier(rules, units) {
    var run = Math.max(1, Math.round(units));
    var tiers = (rules.screen.bulkTiers || []).slice().sort(function (a, b) { return a.minUnits - b.minUnits; })
      .filter(function (t) { return run >= t.minUnits; });
    return tiers.length ? tiers[tiers.length - 1] : null;
  }

  // Screen print per garment for a run: impressions (or a bulk tier's rates),
  // the screens and the admin fee spread over the run, extra locations.
  function screenPrint(rules, units, locations) {
    var s = rules.screen;
    var screens = locations.reduce(function (sum, l) { return sum + locationScreens(s, l); }, 0);
    var run = Math.max(1, Math.round(units));
    var setUp = s.screenFeePerScreen * screens + s.adminFeePerRun;
    var tier = bulkTier(rules, run);
    if (tier) {
      var prints = locations.reduce(function (sum, l) { return sum + tier.firstColourRate + (locationScreens(s, l) - 1) * tier.additionalColourRate; }, 0);
      return prints + setUp / run + tier.additionalLocationRate * extraLocations(locations);
    }
    return impressionCost(s, screens) + setUp / run + s.extraLocationFee * extraLocations(locations);
  }

  // Why a run can't screen print, or null: below the minimum, full-colour art,
  // or more colours than the run's size allows ({ allowed, from } says where
  // the art would screen print).
  function screenReason(rules, units, locations, fullColour) {
    var s = rules.screen;
    if (units < s.minUnits) return { code: "minimum", from: s.minUnits };
    if (!locations.length) return { code: "none" };
    var most = Math.max.apply(null, locations.map(function (l) { return l.colours; }));
    if (fullColour || most > s.maxColours) return { code: "fullColour" };
    var reached = s.colourLimits.filter(function (l) { return units >= l.minUnits; }).sort(function (a, b) { return b.minUnits - a.minUnits; });
    var allowed = reached.length ? reached[0].maxColours : s.maxColours;
    if (most > allowed) {
      var next = s.colourLimits.slice().sort(function (a, b) { return a.minUnits - b.minUnits; })
        .filter(function (l) { return l.maxColours >= most && l.minUnits > units; })[0];
      return { code: "colours", allowed: allowed, from: next ? next.minUnits : null };
    }
    return null;
  }

  // One garment's base for a method: the garment (its bulk price in a bulk
  // screen run), the print, packing — the Studio's baseBreakdown, sizes up to XL.
  function base(rules, garment, method, units, locations) {
    var bulk = method === "screen_print" && bulkTier(rules, units) !== null && garment.garmentBulk != null;
    var garmentPrice = bulk ? garment.garmentBulk : garment.garment;
    var print = method === "dtf" ? dtfPrint(rules, locations) : screenPrint(rules, units, locations);
    var packing = rules.packingPerGarment || 0;
    return { method: method, garment: garmentPrice, print: print, packing: packing, base: round(round(garmentPrice + print + 0 + packing)) };
  }

  // A sale's base as the store will print it: an open store prints each order
  // DTF; a campaign prints its run together, screen printed when it can be.
  // A sale is booked at the DTF base and a screen run's saving is shared,
  // never charged (the Studio's screenSavingsPerGarment): where screen
  // printing costs no less, the creator pays the DTF base (`capped`).
  function quote(rules, garment, opts) {
    var units = Math.max(1, Math.round(opts.units));
    var dtf = base(rules, garment, "dtf", units, opts.locations);
    var reason = opts.campaign ? screenReason(rules, units, opts.locations, opts.fullColour) : { code: "store" };
    dtf.reason = reason;
    dtf.bulk = null;
    dtf.capped = false;
    if (reason !== null) return dtf;
    var screen = base(rules, garment, "screen_print", units, opts.locations);
    screen.reason = null;
    screen.bulk = bulkTier(rules, units);
    screen.capped = false;
    if (screen.base > dtf.base) {
      dtf.method = "screen_print";
      dtf.bulk = screen.bulk;
      dtf.capped = true;
      return dtf;
    }
    return screen;
  }

  // shared/creatorPricing.ts suggestRetail: base × multiplier, lifted to the
  // next .49 / .99.
  function suggest(rules, baseCost) {
    var target = baseCost * rules.suggestedRetailMultiplier;
    var whole = Math.floor(target);
    var candidates = [whole - 0.01, whole + 0.49, whole + 0.99, whole + 1.49];
    for (var i = 0; i < candidates.length; i += 1) if (candidates[i] >= target - 1e-9) return round(candidates[i]);
    return round(whole + 0.99);
  }

  // The calculator's words for a quote: how it prints, what the print line
  // covers, and a note on why a campaign run isn't screen printed or which
  // bulk rates it takes.
  function describe(q) {
    var reason = q.reason || null;
    var note = "";
    if (q.capped) note = "Screen printing this run costs no less than DTF, so you pay the base of a tee printed on its own.";
    else if (q.method === "screen_print") note = q.bulk ? "Bulk rates from " + q.bulk.minUnits + " garments." : "";
    else if (reason && reason.code === "minimum") note = "A campaign run is screen printed from " + reason.from + " garments.";
    else if (reason && reason.code === "fullColour") note = "Full-colour art is DTF printed.";
    else if (reason && reason.code === "colours") note = reason.from ? "More than " + reason.allowed + " ink colours are screen printed from " + reason.from + " garments." : "Too many ink colours to screen print.";
    return {
      method: q.method === "screen_print" ? "Screen printed by hand" : reason && reason.code === "store" ? "DTF, as each order comes in" : "DTF printed",
      printLabel: q.capped ? "The print (at the DTF price)" : q.method === "screen_print" ? "The print, screens and setup" : "The print (DTF)",
      note: note,
    };
  }

  return { round: round, base: base, quote: quote, suggest: suggest, bulkTier: bulkTier, describe: describe };
})();

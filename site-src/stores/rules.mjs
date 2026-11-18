// Rules every client store ARK builds follows (site-src/stores/<store>/).
// A store's catalog.mjs takes these numbers from here rather than keeping its
// own copy, so each new store starts with them. See README.md beside this file.
//
// Shipped orders (Alex, 2026-11-18): a $4.50 handling fee, then shipping.
// Shipping itself is the site's rule (lib/facts.mjs, owner 2026-10-16, the
// same one the ARK designer's checkout charges): $8 for the first item and $3
// for each additional item, $35 at most. Pickup orders pay neither.

/** Added once to every order that ships. */
export const HANDLING_CENTS = 450;

/** Shipping before handling, by the number of items in the order. */
export const SHIPPING_RULE = { firstCents: 800, eachAdditionalCents: 300, maxCents: 3500 };

/** What a shipped order of `count` items pays for shipping and handling, in
 *  cents. Nothing ships for an empty bag. */
export function shippingAndHandlingCents(count, { handlingCents, firstCents, eachAdditionalCents, maxCents } = { handlingCents: HANDLING_CENTS, ...SHIPPING_RULE }) {
  if (!(count > 0)) return 0;
  return handlingCents + Math.min(maxCents, firstCents + (count - 1) * eachAdditionalCents);
}

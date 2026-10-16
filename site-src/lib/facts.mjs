// Every fact the pages state, in one place. Each comes from the site as it
// stood on 2026-10-15 (the page is named beside it). Pages read these values;
// they never type a number of their own.
//
import { gbpData } from "./gbp-data.mjs";

// OWNER DECISIONS (2026-10-15): screen printing's minimum is 24 shirts across
// the site (DTF below that, so there's still no minimum order); the reply
// promise is "within ten minutes" (stated with business hours where there's
// room, so it stays true at 3am); pickup is "local pickup available" — the
// address is never presented as a pickup counter.
//
// STILL TO CONFIRM:
//   · Free shipping: the FAQ says "free shipping on every order, nationwide";
//     the online shop says free over $75. Not stated on the new pages until
//     the owner confirms (FREE_SHIPPING stays null).
//   · Turnaround differs by method (below). The PPC pages' "most orders ship
//     within 5–7 business days" is used for screen printing.

export const SITE = {
  origin: "https://arkscreenprinting.com",
  name: "ARK Screen Printing",
  /** Google Analytics 4 + the Google Ads account configured on every page. */
  ga4: "G-3HRP9PCVCH",
  adsConfig: "AW-1374047993",
  /** The quote form app (repo ark-quote-form), embedded as an iframe. */
  quoteEmbed: "https://ark-quote-form-production.up.railway.app/embed",
};

export const SHOP = {
  name: "ARK Screen Printing",
  owner: "Alex Kinnaman",
  ownerFull: "Alexander Robert Kinnaman",
  phoneDisplay: "(719) 280-2638",
  phoneHref: "tel:+17192802638",
  smsHref: "sms:+17192802638",
  email: "alex@arkscreenprinting.com",
  street: "1755 Telstar Dr, Suite 300",
  city: "Colorado Springs",
  region: "CO",
  postcode: "80922",
  address: "1755 Telstar Dr, Suite 300, Colorado Springs, CO 80922",
  /** What the pages show (owner, 2026-10-16): the city, state and ZIP only.
   *  The full address stays in the structured data for Google. */
  cityLine: "Colorado Springs, CO 80922",
  /** index.html footer and LocalBusiness schema. */
  hours: "Monday – Sunday, 7:30am – 7pm",
  mapsUrl: "https://maps.app.goo.gl/ncwEPkwtvKs4gBBY8",
  /** index.html credentials section and about.html. */
  since: 2024,
  geo: { latitude: 38.8339, longitude: -104.8214 },
  sameAs: ["https://www.facebook.com/arkscreenprinting", "https://www.instagram.com/arkscreenprinting"],
};

export const FACTS = {
  /** index.html, custom-*.html, local pages. */
  noMinimum: true,
  /** Owner, 2026-10-15: the screen-printing minimum across the website. */
  screenFrom: 24,
  turnaround: {
    /** dtf-printing-colorado-springs.html: from artwork approval. */
    dtf: "3–5 business days",
    /** custom-*-ppc.html: "most orders ship within 5–7 business days". */
    screen: "5–7 business days",
    /** custom-embroidery.html / custom-hats-colorado-springs.html (≈2 weeks). */
    embroidery: "7–14 business days",
    /** custom-hats-colorado-springs.html. */
    rush: "Rush orders in as little as a week — ask first",
  },
  /** Owner, 2026-10-15 (was "24 hours" on thank-you.html). */
  replyWithin: "ten minutes",
  /** Said beside the reply promise where there's room. */
  replyHours: "7:30am–7pm Mountain Time, every day",
  /** Owner, 2026-10-15: the proof follows moments after we're in touch, and
   *  printing can begin the same day it's approved. */
  proofSpeed: "moments later",
  /** The lead offer (owner, 2026-10-15): a free mockup of the customer's
   *  design, no obligation, usually within about 10 minutes in business hours.
   *  The secondary: free artwork cleanup. No discount offer. */
  mockupWithin: "about 10 minutes",
  /** Owner, 2026-10-16: after the quote form, a call within five minutes;
   *  the free mockup follows ten minutes after that call. */
  callWithin: "5 minutes",
  mockupAfterCall: "ten minutes",
  printStart: "the same day",
  /** Owner, 2026-10-15: never "pick up at the shop/address". */
  pickup: "Local pickup available",
  /** faq.html: Monarch plastisol, Matsui water-based and discharge inks. */
  inks: "Monarch plastisol, plus Matsui water-based and discharge inks",
  /** index.html guarantee banner. */
  guarantee: "Quality work, on time, or we make it right — at no cost to you.",
  /** null until the owner confirms the rule (see the note at the top). */
  freeShipping: null,
};

/** Live Google reviews on the Reviews page until the Business Profile sync is
 *  approved: the public feed behind the owner's Starwall widget (collection
 *  342). Visitors' browsers read it on each view of /testimonials and its
 *  ticker shows the newest reviews; the built-in ones (content/reviews.json)
 *  stay if it fails, and on every other page. "" turns it off. Starwall's
 *  terms license its widget, not this feed: confirm with Starwall in writing
 *  before this goes live. */
export const REVIEWS_FEED = "https://starwall.io/embed/YiV4AUpveXuQVJ5txn667ugZBx6sNBs4/data";

/** The shop's Google Business Profile: synced from the Business Profile API
 *  at each build when the sync is on (sync/gbp-sync.mjs), otherwise the values
 *  last read by hand (2026-10-13). */
const live = gbpData();
export const GOOGLE = {
  rating: live?.rating ?? 5,
  count: live?.count ?? 10,
  url: SHOP.mapsUrl,
  /** Google's "write a review" page for the shop (its Place ID). */
  writeReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJkatxyWHhgIAR2dfD8Cm-yz4",
  checked: live ? live.fetchedAt.slice(0, 10) : "2026-10-13",
  live: Boolean(live),
};

/** Links into the online shop app (design.arkscreenprinting.com). */
export const APP = {
  trackOrder: "https://design.arkscreenprinting.com/track-order",
  wholesale: "https://design.arkscreenprinting.com/wholesale",
  shipping: "https://design.arkscreenprinting.com/shipping",
  terms: "https://design.arkscreenprinting.com/terms",
  privacy: "https://design.arkscreenprinting.com/privacy",
  refunds: "https://design.arkscreenprinting.com/refund-policy",
  /** The creator platform's sign-up (merch stores). Its landing page lives
   *  here now, at /print-on-demand (owner, 2026-10-16); the app stays on the
   *  app host. */
  studioStart: "https://design.arkscreenprinting.com/studio/start",
  /** The product designer: the print-on-demand categories link here until
   *  the catalogue moves to this site. */
  designer: "https://design.arkscreenprinting.com/",
  artwork: "/images/ark-art-requirements.pdf",
};

/** The creator platform (ark-designer shared/creatorPolicy.ts, shared/const.ts,
 *  server/creator/ledger/rules.ts), for the print-on-demand and fundraising pages. */
export const STORES = {
  onDemandShipDays: "3–5",
  campaignPrintDays: 5,
  /** server/creator/ledger/rules.ts PAYOUT_RULES. */
  payoutAfterShipDays: 21,
  minimumPayoutUsd: 20,
  /** shared/creatorPricing.ts screen.colourLimits: 24+ up to 2 colours, 40+ up to 6. */
  screenColours: [{ from: 24, colours: 2 }, { from: 40, colours: 6 }],
  /** CREATOR_PLATFORM_MODE in production. Set true when sign-ups open (the
   *  offer pages then drop the invite-only note). */
  signupOpen: false,
  /** Owner, 2026-10-16: $8 an order plus $3 for each additional item.
   *  The app's checkout (ark-designer shared/const.ts) still charges $7.99 a
   *  order, free over $75 — the two must match before this page goes live. */
  shippingFirstUsd: 8,
  shippingEachMoreUsd: 3,
  /** The print every quoted base assumes (the Studio's PLANNING_LOCATION). */
  planningPrint: "one full-front print up to 10 × 12 in",
  /** A typical tee price for worked examples — always labelled as one. */
  examplePriceUsd: 24.99,
  sizeExchangeDays: 30,
  defectDays: 30,
};

/** The services menu: every page that sells one service. */
export const SERVICES = [
  { slug: "custom-shirts", label: "Custom T-shirts", icon: "tShirt" },
  { slug: "custom-hoodies", label: "Custom hoodies", icon: "hoodie" },
  { slug: "custom-embroidery", label: "Embroidery", icon: "needle" },
  { slug: "custom-hats-colorado-springs", label: "Custom hats", icon: "baseballCap" },
  { slug: "custom-silk-screen-printing", label: "Screen printing", icon: "printer" },
  { slug: "dtf-printing-colorado-springs", label: "DTF printing", icon: "palette" },
  { slug: "screen-printing-and-embroidery", label: "Screen printing & embroidery", icon: "stack" },
  { slug: "fundraising", label: "Fundraisers", icon: "handHeart" },
  { slug: "print-on-demand", label: "Print on demand", icon: "storefront" },
];

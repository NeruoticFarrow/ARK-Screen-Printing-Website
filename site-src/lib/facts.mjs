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
// Shipping (owner, 2026-10-16): $8 for an order's first item and $3 for each
// additional item, counting at most 9 more ($35 at most), for orders through
// the designer and the stores. Stated only on the print-on-demand page — the
// local pages don't quote shipping. There is no free shipping.
//
// STILL TO CONFIRM:
//   · Turnaround differs by method (below). Screen printing: 5–10 business
//     days (owner, 2026-10-16; the PPC pages said 5–7).

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
  /** The shop on Google Maps (its Place ID). The old maps.app.goo.gl short
   *  link was a share of one review (Jessi Wood’s), so every map and rating
   *  link opened that review (owner, 2026-10-16). */
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=ARK+Screen+Printing&query_place_id=ChIJkatxyWHhgIAR2dfD8Cm-yz4",
  /** index.html credentials section and about.html. */
  since: 2024,
  geo: { latitude: 38.8339, longitude: -104.8214 },
  sameAs: ["https://www.facebook.com/arkscreenprinting", "https://www.instagram.com/arkscreenprinting"],
};

/** The paid-search landing pages' own number (owner, 2026-10-18): every
 *  number those pages show — header, sticky bar, text and call buttons,
 *  footer — is this one; build.mjs swaps it in and check.mjs keeps the two
 *  lines apart. The rest of the site keeps SHOP's number. */
export const PPC_LINE = {
  phoneDisplay: "(719) 203-9508",
  phoneHref: "tel:+17192039508",
  smsHref: "sms:+17192039508",
};

export const FACTS = {
  /** index.html, custom-*.html, local pages. */
  noMinimum: true,
  /** Owner, 2026-10-15: the screen-printing minimum across the website. */
  screenFrom: 24,
  turnaround: {
    /** dtf-printing-colorado-springs.html: from artwork approval. */
    dtf: "3–5 business days",
    /** Owner, 2026-10-16 (was 5–7 on the PPC pages). */
    screen: "5–10 business days",
    /** custom-embroidery.html / custom-hats-colorado-springs.html (≈2 weeks). */
    embroidery: "7–14 business days",
    /** custom-hats-colorado-springs.html. */
    rush: "Rush orders in as little as a week — ask first",
  },
  /** Owner, 2026-10-17: free digital mockups are the response promise. */
  mockupWithin: "10 minutes",
  mockupPromise: "Your free digital mockup will be ready within 10 minutes of confirming the details with you—no commitment required.",
  /** The proof comes before production, and printing can begin the same day
   *  it is approved. */
  proofSpeed: "moments later",
  printStart: "the same day",
  /** Owner, 2026-10-16: what "starts the same day" means — the work begins
   *  that day, the order isn't printed that day. */
  sameDayWork: "garments ordered, films printed, screens burned",
  /** Owner, 2026-10-15: never "pick up at the shop/address". */
  pickup: "Local pickup available",
  /** faq.html: Monarch plastisol, Matsui water-based and discharge inks. */
  inks: "Monarch plastisol, plus Matsui water-based and discharge inks",
  /** index.html guarantee banner. */
  guarantee: "Quality work, on time, or we make it right — at no cost to you.",
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
  /** Every review on Google: the rating badges and "Read all reviews". */
  url: "https://search.google.com/local/reviews?placeid=ChIJkatxyWHhgIAR2dfD8Cm-yz4",
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
  /** shared/creatorPricing.ts screen.colourLimits (owner, 2026-10-16): 24+ up to
   *  3 colours, 40+ up to 6 — the quote form's rule too. */
  screenColours: [{ from: 24, colours: 3 }, { from: 40, colours: 6 }],
  /** CREATOR_PLATFORM_MODE in production. Set true when sign-ups open (the
   *  offer pages then drop the invite-only note). Owner, 2026-10-16: open, so
   *  the store sign-up can be walked through as a creator will see it. */
  signupOpen: true,
  /** Owner, 2026-10-16: $8 for an order's first item plus $3 for each
   *  additional item, up to 9 more ($35 at most) — the rule the app's checkout
   *  charges (ark-designer shared/const.ts, changed in step with this page). */
  shippingFirstUsd: 8,
  shippingEachMoreUsd: 3,
  shippingMaxMoreItems: 9,
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
  { slug: "fundraising", label: "Fundraisers", icon: "handHeart" },
  { slug: "print-on-demand", label: "Print on demand", icon: "storefront" },
];

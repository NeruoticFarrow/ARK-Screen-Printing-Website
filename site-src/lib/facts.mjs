// Every fact the pages state, in one place. Each comes from the site as it
// stood on 2026-10-15 (the page is named beside it). Pages read these values;
// they never type a number of their own.
//
// OWNER TO CONFIRM — the old pages disagreed with each other:
//   · Minimums: home and service pages say "no minimums"; the FAQ recommends
//     12+ for screen printing; the DTF pages say screen printing starts at 6.
//     Reconciled below as: no minimum order (DTF from 1), screen printing from
//     6, best screen-print value from 12.
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
  /** dtf-vs-screen-printing.html, dtf-printing-colorado-springs.html. */
  screenFrom: 6,
  /** faq.html ("we recommend 12+ pieces for screen printing"). */
  screenBestValueFrom: 12,
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
  /** thank-you.html: "we'll get back to you within 24 hours". */
  replyWithin: "24 hours",
  /** faq.html: Monarch plastisol, Matsui water-based and discharge inks. */
  inks: "Monarch plastisol, plus Matsui water-based and discharge inks",
  /** index.html guarantee banner. */
  guarantee: "Quality work, on time, or we make it right — at no cost to you.",
  /** null until the owner confirms the rule (see the note at the top). */
  freeShipping: null,
};

/** The shop's Google Business Profile, as published on the site (5.0) and read
 *  on 2026-10-13 for the review count. Update when it moves. */
export const GOOGLE = {
  rating: 5,
  count: 10,
  url: SHOP.mapsUrl,
  checked: "2026-10-13",
};

/** Links into the online shop app (design.arkscreenprinting.com). */
export const APP = {
  trackOrder: "https://design.arkscreenprinting.com/track-order",
  wholesale: "https://design.arkscreenprinting.com/wholesale",
  shipping: "https://design.arkscreenprinting.com/shipping",
  terms: "https://design.arkscreenprinting.com/terms",
  privacy: "https://design.arkscreenprinting.com/privacy",
  refunds: "https://design.arkscreenprinting.com/refund-policy",
  /** The creator platform (merch stores) — the bridge for groups where
   *  everyone pays for their own (docs: knowledge base chapter 19). */
  studio: "/studio",
  artwork: "/images/ark-art-requirements.pdf",
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
];

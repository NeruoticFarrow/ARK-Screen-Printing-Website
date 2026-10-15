import { FACTS, SHOP } from "../lib/facts.mjs";
import { PHOTOS } from "../lib/media.mjs";

// Copy for the service and paid-search pages, written for the redesign. Each
// page keeps its migrated title, description, H1 and own content; this adds
// what the thin pages lacked (what you get, who it's for, answers) — every
// statement drawn from facts.mjs or from the site's own pages.

const minimumAnswer = [
  `There isn't one. Screen printing starts at ${FACTS.screenFrom} shirts; smaller orders — even a single piece — are printed with DTF, which needs no screens and no setup.`,
];
const turnaroundAnswer = [
  `Most screen-print orders are done in ${FACTS.turnaround.screen}. DTF orders take ${FACTS.turnaround.dtf} from artwork approval, and embroidery ${FACTS.turnaround.embroidery}. Need it sooner? Call or text before you order — rush is often possible.`,
];
const artAnswer = [
  `Yes. Send whatever you have — a logo file, a sketch or an idea — and we'll prepare it for print. Our <a href="/images/ark-art-requirements.pdf">artwork guidelines</a> explain which files print best.`,
];
const pickupAnswer = [
  `Yes — ${FACTS.pickup.toLowerCase()} in ${SHOP.city}, or we'll ship it to you anywhere in the US.`,
];

export const SERVICE_PAGES = {
  "custom-shirts": {
    tile: "Screen printed or DTF, front, back and sleeves. One shirt or a thousand.",
    photo: PHOTOS.folded,
    points: [
      { icon: "printer", title: "The right method for your quantity", text: `Screen printing from ${FACTS.screenFrom} shirts, DTF for anything smaller or full-colour art. We recommend the right one.` },
      { icon: "tShirt", title: "No minimum order", text: "A single shirt for a gift or a few hundred for an event — same shop, same care." },
      { icon: "paintBrush", title: "Help with your artwork", text: "Send a logo, a sketch or an idea. We'll set it up for print and send a proof." },
      { icon: "sealCheck", title: "A proof before we print", text: "You see a digital proof of your design on the shirt and approve it before anything is printed." },
    ],
    uses: ["Teams & schools", "Businesses & staff", "Events & races", "Churches & groups", "Bands & brands", "Reunions & gifts"],
    faq: [
      { q: "What's the minimum for custom t-shirts?", a: minimumAnswer },
      { q: "How long do custom shirts take?", a: turnaroundAnswer },
      { q: "Can you help with my design?", a: artAnswer },
      { q: "Is local pickup available?", a: pickupAnswer },
    ],
  },
  "custom-hoodies": {
    tile: "Hoodies and crewnecks, printed or embroidered, for teams, crews and brands.",
    photo: PHOTOS.backPrint,
    points: [
      { icon: "hoodie", title: "Printed or embroidered", text: "Screen print or DTF for bold front and back designs; embroidery for a clean chest logo." },
      { icon: "tShirt", title: "No minimum order", text: "From one hoodie to a whole team's worth." },
      { icon: "paintBrush", title: "Help with your artwork", text: "We prepare your file for print and send a proof first." },
      { icon: "printer", title: "Printed in our shop", text: `Done in-house in ${SHOP.city}. ${FACTS.pickup}, or we ship.` },
    ],
    uses: ["Teams & boosters", "Company crews", "Schools & clubs", "Brands & merch", "Winter events"],
    faq: [
      { q: "Is there a minimum for custom hoodies?", a: minimumAnswer },
      { q: "Should my hoodie be printed or embroidered?", a: ["Printing suits larger designs and back prints; embroidery suits a small chest logo and looks stitched and premium. Tell us the look you want and we'll recommend one — or show you both on the proof."] },
      { q: "How long do custom hoodies take?", a: turnaroundAnswer },
      { q: "Is local pickup available?", a: pickupAnswer },
    ],
  },
  "custom-silk-screen-printing": {
    tile: "Classic screen printing in plastisol, water-based or discharge inks.",
    photo: PHOTOS.screen,
    points: [
      { icon: "palette", title: "Premium inks", text: `${FACTS.inks}.` },
      { icon: "stack", title: `Built for runs of ${FACTS.screenFrom}+`, text: `Screen printing starts at ${FACTS.screenFrom} shirts — the screens are made once, then every print is fast and the price per shirt drops.` },
      { icon: "sealCheck", title: "A proof before we print", text: "Approve the mockup, the ink colours and the placement first." },
      { icon: "clock", title: `Most orders in ${FACTS.turnaround.screen}`, text: "Rush is often possible — call or text before you order." },
    ],
    uses: ["Teams & schools", "Businesses", "Events", "Bands & brands", "Fundraisers"],
    faq: [
      { q: "What's the minimum for screen printing?", a: [`${FACTS.screenFrom} shirts. Under ${FACTS.screenFrom} we print with DTF, so there's no minimum order overall.`] },
      { q: "What inks do you use?", a: [`${FACTS.inks}. Water-based and discharge inks give a soft print that's part of the fabric; plastisol gives bright, opaque colour on any shirt.`] },
      { q: "How long does screen printing take?", a: turnaroundAnswer },
      { q: "Can you help with my design?", a: artAnswer },
    ],
  },
  "custom-embroidery": {
    tile: "Logos stitched into polos, hats and jackets. Free digitizing on every order.",
    lead: "Logos stitched into polos, hats, jackets and bags — free digitizing on every order and no minimum order.",
  },
  "custom-hats-colorado-springs": {
    tile: "Embroidered and printed caps for crews, teams and brands.",
    lead: `Embroidered and printed caps for crews, teams and brands — no minimum order, about two weeks standard, and rush in as little as a week if you ask first.`,
  },
  "dtf-printing-colorado-springs": {
    tile: "Full-colour transfers with no setup — ideal for small orders.",
    lead: `Full-colour DTF prints pressed in-house — no minimum, no setup fees, and ready in ${FACTS.turnaround.dtf} from artwork approval.`,
  },
  "screen-printing-and-embroidery": {
    tile: "Screen printing, DTF and embroidery under one roof.",
    lead: "Screen printing, DTF and embroidery under one roof in Colorado Springs. Tell us the job and we'll recommend the method that fits it.",
  },
  // The two offer pages render from pages/offers.mjs; these lines feed the home tiles.
  fundraising: { tile: "Raise money with shirts: a bulk order for your event, or a free online store." },
  "print-on-demand": { tile: "Sell online with no inventory — we print and ship every order." },
  "dtf-vs-screen-printing": {
    lead: `Under ${FACTS.screenFrom} shirts, DTF is the better buy. From ${FACTS.screenFrom} up, screen printing is usually better value. ARK does both in-house — you don't have to choose.`,
  },
};

/** The paid-search landing pages (noindex): one service each, minimal chrome. */
export const PPC_PAGES = {
  "custom-shirts-ppc": { service: "custom-shirts" },
  "custom-hoodies-ppc": { service: "custom-hoodies" },
  "custom-silk-screen-printing-ppc": { service: "custom-silk-screen-printing" },
  "custom-work-shirts": {
    service: "custom-shirts",
    photo: PHOTOS.business,
    points: [
      { icon: "buildings", title: "Reorders that match", text: "A reorder starts from your approved proof — the same logo, ink colours and placement as the first run." },
      { icon: "needle", title: "Printed or embroidered", text: "A printed left-chest logo or a stitched one — both done in-house." },
      { icon: "tShirt", title: "No minimum order", text: "Outfit two new hires or the whole crew." },
      { icon: "sealCheck", title: "A proof before we print", text: "Approve the digital proof before anything is printed." },
    ],
    uses: ["Contractors & trades", "Restaurants & cafés", "Shops & salons", "Offices & clinics", "Event staff"],
  },
};

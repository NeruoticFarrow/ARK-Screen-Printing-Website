// The FAQ page: the print shop's own questions, for people ordering screen
// printing, DTF or embroidery in Colorado Springs. The migrated page had the
// online designer's FAQ instead (self-serve checkout, accounts, wholesale) —
// replaced at the owner's request, 2026-10-16. The answers keep the owner's
// wording where it still holds (inks, colours, seams, returns) and take every
// number from facts.mjs. No shipping prices here: those belong to the designer
// and the print-on-demand page.

import { APP, FACTS, SHOP } from "../lib/facts.mjs";
import { esc } from "../lib/html.mjs";

const phone = `<a href="${esc(SHOP.phoneHref)}">${esc(SHOP.phoneDisplay)}</a>`;
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const FAQ_GROUPS = [
  {
    title: "Ordering and price",
    items: [
      { q: "How do I get a price?", a: [`Fill in our <a href="/get-a-quote#quote">quote form</a> — your price shows as you go, and it takes about two minutes. Send it and we'll call you within ${FACTS.callWithin} to go over the details (${FACTS.replyHours}). Rather talk first? Call or text ${phone}.`] },
      { q: "Is there a minimum order?", a: [`No minimum order. Screen printing starts at ${FACTS.screenFrom} shirts — that's where making a screen for each ink colour pays off. Under ${FACTS.screenFrom}, we print with DTF: full colour, no setup, even for a single shirt.`] },
      { q: "Is the mockup really free?", a: [`Yes. ${capital(FACTS.mockupAfterCall)} after our call, you get a free mockup of your design on your garment — no obligation to order. Tweak it until it's right.`] },
      { q: "How do I pay, and when does printing start?", a: [`Once the details are set, we send an invoice. Approve your mockup and pay the invoice, and printing can start ${FACTS.printStart}.`] },
      { q: "How long will my order take?", a: [`Screen printing takes ${FACTS.turnaround.screen}, DTF ${FACTS.turnaround.dtf} and embroidery ${FACTS.turnaround.embroidery} from when you approve your artwork. ${FACTS.turnaround.rush}.`] },
    ],
  },
  {
    title: "Printing",
    items: [
      { q: "Screen printing or DTF — which do I need?", a: [`Screen printing gives the most durable, vibrant print and the lowest price per shirt from ${FACTS.screenFrom}. DTF suits smaller orders and full-colour artwork, with no setup. Not sure? We'll recommend one with your quote — or read <a href="/dtf-vs-screen-printing">DTF vs screen printing</a>.`] },
      { q: "What inks do you use?", a: [`${FACTS.inks} — the best inks on the market for what each one does.`] },
      { q: "Can you match Pantone colours?", a: ["Yes — we custom-mix inks to match Pantone colours for brand consistency. Tell us the colours with your quote."] },
      { q: "How many colours can my design have?", a: ["Our manual presses print up to six spot colours, and more with simulated process and CMYK prints. Full-colour designs can also print with DTF."] },
      { q: "Can you print over seams, zippers or pockets?", a: ["Yes — it's a matter of planning for them before we print. Tell us where you want the print and we'll confirm the placement on your mockup."] },
      { q: "Do you do embroidery?", a: [`Yes — hats, polos, jackets and more, in about ${FACTS.turnaround.embroidery}. See <a href="/custom-embroidery">custom embroidery</a>.`] },
    ],
  },
  {
    title: "Artwork",
    items: [
      { q: "What artwork should I send?", a: [`High-resolution (300 dpi or more) PNG or JPEG files, or SVG vectors. For the cleanest print, send a PNG or SVG with a transparent background. Here are our <a href="${esc(APP.artwork)}">artwork guidelines (PDF)</a>.`] },
      { q: "My artwork is rough — can you help?", a: ["Yes, free. Send a sketch, a photo or a rough logo and we'll clean it up for print — you'll see it on your mockup before anything prints."] },
    ],
  },
  {
    title: "Pickup and your order",
    items: [
      { q: "Can I pick up my order?", a: [`${FACTS.pickup} in ${SHOP.city}, or we can ship your order — tell us which on your quote.`] },
      { q: "What if something's wrong with my order?", a: [`${FACTS.guarantee} Every order is printed to your design, so we can't take returns for a change of mind — but if something arrives wrong or defective, call or text ${phone} and we'll fix it.`] },
      { q: "Can everyone in my group order and pay for their own?", a: [`Yes — with a free online store, each person picks their size and pays, and we print every order. See <a href="/print-on-demand">print on demand</a>, or <a href="/fundraising">fundraising</a> if you're raising money.`] },
    ],
  },
];

export const FAQ_ITEMS = FAQ_GROUPS.flatMap((g) => g.items);

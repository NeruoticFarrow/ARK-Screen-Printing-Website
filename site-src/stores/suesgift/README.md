# Sue's Gift store (sample)

`https://arkscreenprinting.com/suesgift`: a sample fundraising store for Sue's Gift (gynecologic cancer support, Colorado Springs), built after they asked to see one. It's a **sample**: the bag works and adds up shipping, but there's no checkout, and the page makes no requests at all. It's unlisted (`noindex`).

It's built on the Best of the Springs template (`../bots`), so the files have the same jobs:

| What | File |
|---|---|
| Products, colours, prices, print placements, delivery | `catalog.mjs` |
| The handling fee and shipping rule every store uses | `../rules.mjs` |
| The page (React) | `app.jsx`, `icons.jsx`, `styles.css` |
| Draws a garment in any colour, with its prints | `render.js` |
| Garment templates: tee and tote copied from bots; the PC78H hoodie made by `tools/hoodie-photos.py` then `tools/garment-maps.mjs hood-front,hood-back` | `images/garments/` |
| Print artwork, made from Sue's Gift's logo | `images/art/`, made by `tools/art.py` |
| Fonts: Literata and Mona Sans (SIL OFL) | `fonts/` |
| Bundles everything into `ark-site-review/suesgift.html` | `build.mjs` (run by `npm run build`) |
| Tests | `tests/` (`npm test`) |

## The products

| Product | Garment | Front | Back |
|---|---|---|---|
| You're Not Alone Tee | Staple Tee 5001, Charlotte | Heart, left chest | "You're not alone." |
| Be Ovary Aware 2027 Tee (event) | Staple Tee 5001, Seafoam | Race graphic | Race line |
| Sue's Gift Logo Tee | Staple Tee 5001, White | Full logo | Round mark, back of neck |
| TEAL Tee-Off Tee (event) | Staple Tee 5001, White | Small mark, left chest | Tournament graphic |
| Cheers to You Tee (event) | Staple Tee 5001, Natural | A Toast to TEAL graphic | Round mark, back of neck |
| You're Not Alone Hoodie | Port & Company PC78H, Teal | Heart, left chest | "You're not alone." |
| Sue's Gift Logo Hoodie | PC78H, Creme | Full logo | Round mark, below the hood |
| Be Ovary Aware 2027 Hoodie (event) | PC78H, Jet Black | Race graphic | Race line |
| Sue's Gift Carrie Tote | Carrie Tote 1001, Cream | Round mark and wordmark | Heart |

Every product comes in every colour its garment does. On light garments the print is teal; on dark ones (below `LIGHT_GARMENT_CONTRAST`) it switches to the one-colour white version (`<name>-white.webp`).

Event names (A Toast to TEAL, TEAL Tee-Off, Be Ovary Aware 5K) and every phrase on the shirts come from Sue's Gift's own site. Nothing is invented.

## Indexing and the footer credit

- `STORE.indexable` decides whether search engines may index the page. It sets both the `<meta name="robots">` tag and the `X-Robots-Tag` header. Samples stay `false` (noindex): they show the nonprofit's logo before it has agreed to a store, and nothing can be bought. Set it to `true` when the store goes live. The build refuses `sample: true` with `indexable: true`.
- `STORE.credit` is the footer credit every store carries: "Fundraising store by ARK Screen Printing", linking to https://arkscreenprinting.com for now. Change the `href` when there's a dedicated fundraising page.

## Prices

Samples use flat retail prices that stand in for the nonprofit's own markup (Alex, 2026-11-28): tees $29.99, hoodies $59.99 (2XL–3XL +$3, 4XL–5XL +$5 on both) and totes $29.99. At $24.99 the two-sided tote left Sue's Gift 39¢ an item.

ARK's price behind each item, from `node site-src/stores/tools/cost-table.mjs <ark-designer> site-src/stores/suesgift` (2026-11-28). It is for Alex only and never goes on the page. "(sim)" means the designer's color detection reads the print as full-color (the Sue's Gift mark's shaded silver ring), so it prints digitally until the mark is redrawn in spot colors.

| Product | Blank, wholesale | Ink colors, front + back | ARK price, digital (any qty) | Screen print, 24 | Screen print, 48 | Screen print, 72 | Retail | Org keeps per item |
|---|---|---|---|---|---|---|---|---|
| You're Not Alone Tee | 5001, $5.65 | 1 + 1 | $21.72 | $20.08 | $18.62 | $18.14 | $29.99 | $8.27 to $11.85 |
| Be Ovary Aware 2027 Tee | 5001, $5.65 | 6 (sim) + 6 (sim) | $25.91 | n/a | n/a | n/a | $29.99 | $4.08 |
| Sue's Gift Logo Tee | 5001, $5.65 | 6 (sim) + 6 (sim) | $21.25 | n/a | n/a | n/a | $29.99 | $8.74 |
| TEAL Tee-Off Tee | 5001, $5.65 | 1 + 2 | $23.53 | $22.97 | $20.79 | $20.06 | $29.99 | $6.46 to $9.93 |
| Cheers to You Tee | 5001, $5.65 | 6 (sim) + 6 (sim) | $20.92 | n/a | n/a | n/a | $29.99 | $9.07 |
| You're Not Alone Hoodie | PC78H, $10.00 | 1 + 1 | $30.09 | $28.78 | $27.32 | $26.84 | $59.99 | $29.90 to $33.15 |
| Sue's Gift Logo Hoodie | PC78H, $10.00 | 6 (sim) + 6 (sim) | $30.11 | n/a | n/a | n/a | $59.99 | $29.88 |
| Be Ovary Aware 2027 Hoodie | PC78H, $10.00 | 1 + 1 | $34.11 | $28.78 | $27.32 | $26.84 | $59.99 | $25.88 to $33.15 |
| Sue's Gift Carrie Tote | 1001, $6.90 | 6 (sim) + 1 | $24.60 | n/a | n/a | n/a | $29.99 | $5.39 |

## Delivery

- Delivery is ship-to-door only (Alex, 2026-11-27). Add store or event pickup only for a real store that wants to hand garments out.

## Remaking the artwork

```
python3 site-src/stores/suesgift/tools/art.py <folder of TTFs>
```

The folder needs Literata-400.ttf, Literata-400i.ttf, Literata-600.ttf and Montserrat-700/800/900.ttf. It reads `tools/src/sues-gift-logo.png` and writes both versions of every design into `images/art/`.

## Going live

Merging this to main deploys the page through Netlify at `/suesgift` (unlisted). Only share the link once Alex has OK'd it.

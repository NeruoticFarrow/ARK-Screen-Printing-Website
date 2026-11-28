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
| Sue's Gift Carrie Tote | Carrie Tote 1001, Cream | Round mark and wordmark | None |

Every product comes in every colour its garment does. On light garments the print is teal; on dark ones (below `LIGHT_GARMENT_CONTRAST`) it switches to the one-colour white version (`<name>-white.webp`).

Event names (A Toast to TEAL, TEAL Tee-Off, Be Ovary Aware 5K) and every phrase on the shirts come from Sue's Gift's own site. Nothing is invented.

## Indexing and the footer credit

- `STORE.indexable` decides whether search engines may index the page. It sets both the `<meta name="robots">` tag and the `X-Robots-Tag` header. Samples stay `false` (noindex): they show the nonprofit's logo before it has agreed to a store, and nothing can be bought. Set it to `true` when the store goes live. The build refuses `sample: true` with `indexable: true`.
- `STORE.credit` is the footer credit every store carries: "Fundraising store by ARK Screen Printing", linking to https://arkscreenprinting.com for now. Change the `href` when there's a dedicated fundraising page.

## Prices

Samples use flat retail prices that stand in for the nonprofit's own markup (Alex, 2026-11-28): tees $29.99, hoodies $59.99 (2XL–3XL +$3, 4XL–5XL +$5 on both) and totes $24.99. The tote prints on the front only: with a second print, $24.99 left Sue's Gift 39¢ an item.

ARK's price behind each item by order quantity, from `node site-src/stores/tools/cost-table.mjs <ark-designer> site-src/stores/suesgift site-src/stores/suesgift/pricing` (2026-11-28; also in `pricing/pricing.csv` and `pricing/pricing.pdf`). It is for Alex only and never goes on the page. Tiers are 1–24, 25–49 and 50–100, each priced at its smallest and largest order: the quote rules switch to screen print at 24 pieces, so a 24-piece order is already cheaper than 23. "Full color" means the designer's color detection reads the print as full color (the Sue's Gift mark's shaded silver ring), so it prints digitally at any quantity until the mark is redrawn in spot colors.

| Product | Blank, wholesale | Ink colors | Qty | Method | ARK price per item | Retail | Org keeps per item | Org keeps, whole tier |
|---|---|---|---|---|---|---|---|---|
| You're Not Alone Tee | 5001, $5.65 | 1 + 1 | 1–24 | digital→screen | $21.72–$20.08 | $29.99 | $8.27–$9.91 | $8.27–$237.80 |
| You're Not Alone Tee | 5001, $5.65 | 1 + 1 | 25–49 | screen | $19.96–$18.59 | $29.99 | $10.02–$11.40 | $250.62–$558.42 |
| You're Not Alone Tee | 5001, $5.65 | 1 + 1 | 50–100 | screen | $18.57–$17.87 | $29.99 | $11.42–$12.12 | $571.25–$1212.50 |
| Be Ovary Aware 2027 Tee | 5001, $5.65 | 6 (full color) + 6 (full color) | 1–24 | digital | $25.91 | $29.99 | $4.08 | $4.08–$97.97 |
| Be Ovary Aware 2027 Tee | 5001, $5.65 | 6 (full color) + 6 (full color) | 25–49 | digital | $25.91 | $29.99 | $4.08 | $102.05–$200.02 |
| Be Ovary Aware 2027 Tee | 5001, $5.65 | 6 (full color) + 6 (full color) | 50–100 | digital | $25.91 | $29.99 | $4.08 | $204.11–$408.21 |
| Sue's Gift Logo Tee | 5001, $5.65 | 6 (full color) + 6 (full color) | 1–24 | digital | $21.25 | $29.99 | $8.74 | $8.74–$209.85 |
| Sue's Gift Logo Tee | 5001, $5.65 | 6 (full color) + 6 (full color) | 25–49 | digital | $21.25 | $29.99 | $8.74 | $218.60–$428.45 |
| Sue's Gift Logo Tee | 5001, $5.65 | 6 (full color) + 6 (full color) | 50–100 | digital | $21.25 | $29.99 | $8.74 | $437.19–$874.38 |
| TEAL Tee-Off Tee | 5001, $5.65 | 1 + 2 | 1–24 | digital→screen | $23.53–$22.97 | $29.99 | $6.46–$7.02 | $6.46–$168.42 |
| TEAL Tee-Off Tee | 5001, $5.65 | 1 + 2 | 25–49 | screen | $22.80–$20.74 | $29.99 | $7.19–$9.25 | $179.81–$453.23 |
| TEAL Tee-Off Tee | 5001, $5.65 | 1 + 2 | 50–100 | screen | $20.70–$19.65 | $29.99 | $9.29–$10.34 | $464.62–$1034.25 |
| Cheers to You Tee | 5001, $5.65 | 6 (full color) + 6 (full color) | 1–24 | digital | $20.92 | $29.99 | $9.07 | $9.07–$217.67 |
| Cheers to You Tee | 5001, $5.65 | 6 (full color) + 6 (full color) | 25–49 | digital | $20.92 | $29.99 | $9.07 | $226.74–$444.41 |
| Cheers to You Tee | 5001, $5.65 | 6 (full color) + 6 (full color) | 50–100 | digital | $20.92 | $29.99 | $9.07 | $453.48–$906.95 |
| You're Not Alone Hoodie | PC78H, $10.00 | 1 + 1 | 1–24 | digital→screen | $30.09–$28.78 | $59.99 | $29.90–$31.21 | $29.90–$749.00 |
| You're Not Alone Hoodie | PC78H, $10.00 | 1 + 1 | 25–49 | screen | $28.66–$27.29 | $59.99 | $31.33–$32.70 | $783.13–$1602.13 |
| You're Not Alone Hoodie | PC78H, $10.00 | 1 + 1 | 50–100 | screen | $27.27–$26.57 | $59.99 | $32.73–$33.42 | $1636.25–$3342.50 |
| Sue's Gift Logo Hoodie | PC78H, $10.00 | 6 (full color) + 6 (full color) | 1–24 | digital | $30.11 | $59.99 | $29.88 | $29.88–$717.13 |
| Sue's Gift Logo Hoodie | PC78H, $10.00 | 6 (full color) + 6 (full color) | 25–49 | digital | $30.11 | $59.99 | $29.88 | $747.01–$1464.14 |
| Sue's Gift Logo Hoodie | PC78H, $10.00 | 6 (full color) + 6 (full color) | 50–100 | digital | $30.11 | $59.99 | $29.88 | $1494.02–$2988.05 |
| Be Ovary Aware 2027 Hoodie | PC78H, $10.00 | 1 + 1 | 1–24 | digital→screen | $34.11–$28.78 | $59.99 | $25.88–$31.21 | $25.88–$749.00 |
| Be Ovary Aware 2027 Hoodie | PC78H, $10.00 | 1 + 1 | 25–49 | screen | $28.66–$27.29 | $59.99 | $31.33–$32.70 | $783.13–$1602.13 |
| Be Ovary Aware 2027 Hoodie | PC78H, $10.00 | 1 + 1 | 50–100 | screen | $27.27–$26.57 | $59.99 | $32.73–$33.42 | $1636.25–$3342.50 |
| Sue's Gift Carrie Tote | 1001, $6.90 | 6 (full color) | 1–24 | digital | $18.49 | $24.99 | $6.50 | $6.50–$156.00 |
| Sue's Gift Carrie Tote | 1001, $6.90 | 6 (full color) | 25–49 | digital | $18.49 | $24.99 | $6.50 | $162.50–$318.50 |
| Sue's Gift Carrie Tote | 1001, $6.90 | 6 (full color) | 50–100 | digital | $18.49 | $24.99 | $6.50 | $325.00–$650.00 |

## Delivery

- Delivery is ship-to-door only (Alex, 2026-11-27). Add store or event pickup only for a real store that wants to hand garments out.

## Remaking the artwork

```
python3 site-src/stores/suesgift/tools/art.py <folder of TTFs>
```

The folder needs Literata-400.ttf, Literata-400i.ttf, Literata-600.ttf and Montserrat-700/800/900.ttf. It reads `tools/src/sues-gift-logo.png` and writes both versions of every design into `images/art/`.

## Going live

Merging this to main deploys the page through Netlify at `/suesgift` (unlisted). Only share the link once Alex has OK'd it.

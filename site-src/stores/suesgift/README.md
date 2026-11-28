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

Samples use flat retail prices that stand in for the nonprofit's own markup (Alex, 2026-11-28): tees $29.99, hoodies $79.99 (2XL–3XL +$3, 4XL–5XL +$5 on both) and totes $24.99. The tote prints on the front only: with a second print, $24.99 left Sue's Gift 39¢ an item.

ARK's price behind each item by order quantity, from `node site-src/stores/tools/cost-table.mjs <ark-designer> site-src/stores/suesgift site-src/stores/suesgift/pricing` (2026-11-28; also in `pricing/pricing.csv` and `pricing/pricing.pdf`). It is for Alex only and never goes on the page. Tiers are 1–24, 25–49 and 50–100, each priced at its smallest and largest order: the quote rules switch to screen print at 24 pieces, so a 24-piece order is already cheaper than 23. "Full color" means the designer's color detection reads the print as full color (the Sue's Gift mark's shaded silver ring), so it prints digitally at any quantity until the mark is redrawn in spot colors.

Every product is priced on two garment tiers (`site-src/stores/tiers.mjs`): Premium, the AS Colour blank the store shows, and Standard, ARK's mid-range blank at a lower suggested retail set so Sue's Gift keeps about the same per item. The premium hoodie is priced as the AS Colour Stencil Hood 5102; the page still shows the PC78H photos until the Stencil Hood photos are in.

| Product | Ink colors | Qty | Method | Premium: ARK price | Premium: org keeps per item | Premium: org keeps, whole tier | Standard: ARK price | Standard: org keeps per item | Standard: org keeps, whole tier |
|---|---|---|---|---|---|---|---|---|---|
| You're Not Alone Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 1 + 1 | 1–24 | digital→screen | $21.72–$20.08 | $8.27–$9.91 | $8.27–$237.80 | $18.82–$17.18 | $8.17–$9.81 | $8.17–$235.40 |
|  | 1 + 1 | 25–49 | screen | $19.96–$18.59 | $10.02–$11.40 | $250.62–$558.42 | $17.06–$15.69 | $9.93–$11.30 | $248.13–$553.52 |
|  | 1 + 1 | 50–100 | screen | $18.57–$17.87 | $11.42–$12.12 | $571.25–$1212.50 | $15.67–$14.96 | $11.32–$12.02 | $566.25–$1202.50 |
| Be Ovary Aware 2027 Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 6 (full color) + 6 (full color) | 1–24 | digital | $25.91 | $4.08 | $4.08–$97.97 | $23.01 | $3.98 | $3.98–$95.57 |
|  | 6 (full color) + 6 (full color) | 25–49 | digital | $25.91 | $4.08 | $102.05–$200.02 | $23.01 | $3.98 | $99.55–$195.12 |
|  | 6 (full color) + 6 (full color) | 50–100 | digital | $25.91 | $4.08 | $204.11–$408.21 | $23.01 | $3.98 | $199.11–$398.21 |
| Sue's Gift Logo Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 6 (full color) + 6 (full color) | 1–24 | digital | $21.25 | $8.74 | $8.74–$209.85 | $18.35 | $8.64 | $8.64–$207.45 |
|  | 6 (full color) + 6 (full color) | 25–49 | digital | $21.25 | $8.74 | $218.60–$428.45 | $18.35 | $8.64 | $216.10–$423.55 |
|  | 6 (full color) + 6 (full color) | 50–100 | digital | $21.25 | $8.74 | $437.19–$874.38 | $18.35 | $8.64 | $432.19–$864.38 |
| TEAL Tee-Off Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 1 + 2 | 1–24 | digital→screen | $23.53–$22.97 | $6.46–$7.02 | $6.46–$168.42 | $20.63–$20.07 | $6.36–$6.92 | $6.36–$166.02 |
|  | 1 + 2 | 25–49 | screen | $22.80–$20.74 | $7.19–$9.25 | $179.81–$453.23 | $19.90–$17.84 | $7.09–$9.15 | $177.31–$448.33 |
|  | 1 + 2 | 50–100 | screen | $20.70–$19.65 | $9.29–$10.34 | $464.62–$1034.25 | $17.80–$16.75 | $9.19–$10.24 | $459.62–$1024.25 |
| Cheers to You Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 6 (full color) + 6 (full color) | 1–24 | digital | $20.92 | $9.07 | $9.07–$217.67 | $18.02 | $8.97 | $8.97–$215.27 |
|  | 6 (full color) + 6 (full color) | 25–49 | digital | $20.92 | $9.07 | $226.74–$444.41 | $18.02 | $8.97 | $224.24–$439.51 |
|  | 6 (full color) + 6 (full color) | 50–100 | digital | $20.92 | $9.07 | $453.48–$906.95 | $18.02 | $8.97 | $448.48–$896.95 |
| You're Not Alone Hoodie<br>Premium AS Colour Stencil Hood, $23.00, retail $79.99<br>Standard Independent Trading IND4000, $17.35, retail $68.99 | 1 + 1 | 1–24 | digital→screen | $56.09–$54.78 | $23.90–$25.21 | $23.90–$605.00 | $44.79–$43.48 | $24.20–$25.51 | $24.20–$612.20 |
|  | 1 + 1 | 25–49 | screen | $54.66–$53.29 | $25.32–$26.70 | $633.12–$1308.13 | $43.37–$41.99 | $25.62–$27.00 | $640.62–$1322.82 |
|  | 1 + 1 | 50–100 | screen | $53.27–$52.56 | $26.72–$27.42 | $1336.25–$2742.50 | $41.97–$41.27 | $27.02–$27.72 | $1351.25–$2772.50 |
| Sue's Gift Logo Hoodie<br>Premium AS Colour Stencil Hood, $23.00, retail $79.99<br>Standard Independent Trading IND4000, $17.35, retail $68.99 | 6 (full color) + 6 (full color) | 1–24 | digital | $56.11 | $23.88 | $23.88–$573.13 | $44.81 | $24.18 | $24.18–$580.33 |
|  | 6 (full color) + 6 (full color) | 25–49 | digital | $56.11 | $23.88 | $597.01–$1170.14 | $44.81 | $24.18 | $604.51–$1184.84 |
|  | 6 (full color) + 6 (full color) | 50–100 | digital | $56.11 | $23.88 | $1194.02–$2388.05 | $44.81 | $24.18 | $1209.02–$2418.05 |
| Be Ovary Aware 2027 Hoodie<br>Premium AS Colour Stencil Hood, $23.00, retail $79.99<br>Standard Independent Trading IND4000, $17.35, retail $68.99 | 1 + 1 | 1–24 | digital→screen | $60.11–$54.78 | $19.88–$25.21 | $19.88–$605.00 | $48.81–$43.48 | $20.18–$25.51 | $20.18–$612.20 |
|  | 1 + 1 | 25–49 | screen | $54.66–$53.29 | $25.32–$26.70 | $633.12–$1308.13 | $43.37–$41.99 | $25.62–$27.00 | $640.62–$1322.82 |
|  | 1 + 1 | 50–100 | screen | $53.27–$52.56 | $26.72–$27.42 | $1336.25–$2742.50 | $41.97–$41.27 | $27.02–$27.72 | $1351.25–$2772.50 |
| Sue's Gift Carrie Tote<br>Premium AS Colour Carrie Tote, $6.90, retail $24.99<br>Standard Liberty Bags 8501 Katelyn, $3.21, retail $17.99 | 6 (full color) | 1–24 | digital | $18.49 | $6.50 | $6.50–$156.00 | $11.11 | $6.88 | $6.88–$165.12 |
|  | 6 (full color) | 25–49 | digital | $18.49 | $6.50 | $162.50–$318.50 | $11.11 | $6.88 | $172.00–$337.12 |
|  | 6 (full color) | 50–100 | digital | $18.49 | $6.50 | $325.00–$650.00 | $11.11 | $6.88 | $344.00–$688.00 |

## Delivery

- Delivery is ship-to-door only (Alex, 2026-11-27). Add store or event pickup only for a real store that wants to hand garments out.

## Remaking the artwork

```
python3 site-src/stores/suesgift/tools/art.py <folder of TTFs>
```

The folder needs Literata-400.ttf, Literata-400i.ttf, Literata-600.ttf and Montserrat-700/800/900.ttf. It reads `tools/src/sues-gift-logo.png` and writes both versions of every design into `images/art/`.

## Going live

Merging this to main deploys the page through Netlify at `/suesgift` (unlisted). Only share the link once Alex has OK'd it.

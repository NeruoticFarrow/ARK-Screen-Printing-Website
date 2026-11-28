# Sue's Gift store (sample)

`https://arkscreenprinting.com/suesgift`: a sample fundraising store for Sue's Gift (gynecologic cancer support, Colorado Springs), built after they asked to see one. It's a **sample**: the bag works and adds up shipping, but there's no checkout, and the page makes no requests at all. It's unlisted (`noindex`).

It's built on the Best of the Springs template (`../bots`), so the files have the same jobs:

| What | File |
|---|---|
| Products, colours, prices, print placements, delivery | `catalog.mjs` |
| The handling fee and shipping rule every store uses | `../rules.mjs` |
| The page (React) | `app.jsx`, `icons.jsx`, `styles.css` |
| Draws a garment in any colour, with its prints | `render.js` |
| Garment templates: tee and tote copied from bots; the Stencil Hood 5102 made by `tools/garment-maps.mjs <photos> hood-front,hood-back` from AS Colour's white and black photos (1280 px from cdn11.bigcommerce.com, scaled to 1000) | `images/garments/` |
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
| You're Not Alone Hoodie | AS Colour Stencil Hood 5102, Petrol Blue | Heart, left chest | "You're not alone." |
| Sue's Gift Logo Hoodie | 5102, Ecru | Full logo | Round mark, below the hood |
| Be Ovary Aware 2027 Hoodie (event) | 5102, Black | Race graphic | Race line |
| Sue's Gift Carrie Tote | Carrie Tote 1001, Cream | Round mark and wordmark | None |

Every product comes in every colour its garment does. On light garments the print is teal; on dark ones (below `LIGHT_GARMENT_CONTRAST`) it switches to the one-colour white version (`<name>-white.webp`).

Event names (A Toast to TEAL, TEAL Tee-Off, Be Ovary Aware 5K) and every phrase on the shirts come from Sue's Gift's own site. Nothing is invented.

## Indexing and the footer credit

- `STORE.indexable` decides whether search engines may index the page. It sets both the `<meta name="robots">` tag and the `X-Robots-Tag` header. Samples stay `false` (noindex): they show the nonprofit's logo before it has agreed to a store, and nothing can be bought. Set it to `true` when the store goes live. The build refuses `sample: true` with `indexable: true`.
- `STORE.credit` is the footer credit every store carries: "Fundraising store by ARK Screen Printing", linking to https://arkscreenprinting.com for now. Change the `href` when there's a dedicated fundraising page.

## Prices

Samples use flat retail prices that stand in for the nonprofit's own markup (Alex, 2026-11-28): tees $29.99, hoodies $79.99 (2XL–3XL +$3, 4XL–5XL +$5 on both) and totes $24.99. The tote prints on the front only: with a second print, $24.99 left Sue's Gift 39¢ an item.

ARK's price behind each item by order quantity, from `node site-src/stores/tools/cost-table.mjs <ark-designer> site-src/stores/suesgift site-src/stores/suesgift/pricing` (2026-11-28; also in `pricing/pricing.csv` and `pricing/pricing.pdf`). It is for Alex only and never goes on the page or to the client. Prices use the quote form's rules as ark-designer carries them (`shared/creatorPricing.ts`, `PRICE_RULES_V2`): digital is DTF film at the gang-sheet rate, and at each quantity the table takes the cheaper method allowed. ARK margin is that price less the blank's wholesale cost and the film's raw cost; press, impression, screen and admin fees count as margin. Tiers are 1–24, 25–49 and 50–100, each priced at its smallest and largest order. A print the designer's color detection reads as full color (the Sue's Gift mark's shaded heart and ring) shows its `spotColours` count, "redrawn": the colors it would take redrawn in flat spot colors, for screen print.

Every product is priced on two garment tiers (`site-src/stores/tiers.mjs`): Premium, the AS Colour blank the store shows, and Standard, ARK's mid-range blank at a lower suggested retail set so Sue's Gift keeps about the same per item.

| Product | Ink colors | Qty | Premium: method | ARK price | ARK margin | Org keeps | Standard: method | ARK price | ARK margin | Org keeps |
|---|---|---|---|---|---|---|---|---|---|---|
| You're Not Alone Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 1 + 1 | 1–24 | digital→screen | $22.08–$21.04 | $14.54–$15.39 | $7.91–$8.95 | digital→screen | $18.98–$17.93 | $12.89–$13.73 | $8.01–$9.06 |
|  | 1 + 1 | 25–49 | screen | $20.88–$19.06 | $15.23–$13.41 | $9.11–$10.93 | screen | $17.78–$15.96 | $13.58–$11.76 | $9.21–$11.03 |
|  | 1 + 1 | 50–100 | screen | $19.02–$18.09 | $13.37–$12.44 | $10.97–$11.90 | screen | $15.92–$14.99 | $11.72–$10.79 | $11.07–$12.00 |
| Be Ovary Aware 2027 Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 1 (redrawn) + 1 (redrawn) | 1–24 | digital→screen | $26.86–$21.04 | $16.93–$15.39 | $3.13–$8.95 | digital→screen | $23.76–$17.93 | $15.28–$13.73 | $3.23–$9.06 |
|  | 1 (redrawn) + 1 (redrawn) | 25–49 | screen | $20.88–$19.06 | $15.23–$13.41 | $9.11–$10.93 | screen | $17.78–$15.96 | $13.58–$11.76 | $9.21–$11.03 |
|  | 1 (redrawn) + 1 (redrawn) | 50–100 | screen | $19.02–$18.09 | $13.37–$12.44 | $10.97–$11.90 | screen | $15.92–$14.99 | $11.72–$10.79 | $11.07–$12.00 |
| Sue's Gift Logo Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 3 (redrawn) + 3 (redrawn) | 1–24 | digital | $21.38 | $14.19 | $8.61 | digital | $18.28 | $12.54 | $8.71 |
|  | 3 (redrawn) + 3 (redrawn) | 25–49 | digital | $21.38 | $14.19 | $8.61 | digital | $18.28 | $12.54 | $8.71 |
|  | 3 (redrawn) + 3 (redrawn) | 50–100 | digital | $21.38 | $14.19 | $8.61 | digital | $18.28 | $12.54 | $8.71 |
| TEAL Tee-Off Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 1 + 2 | 1–24 | digital→screen | $24.06–$23.92 | $15.53–$18.27 | $5.93–$6.07 | digital→screen | $20.96–$20.82 | $13.88–$16.62 | $6.03–$6.17 |
|  | 1 + 2 | 25–49 | screen | $23.71–$21.20 | $18.06–$15.55 | $6.28–$8.79 | screen | $20.61–$18.10 | $16.41–$13.90 | $6.38–$8.89 |
|  | 1 + 2 | 50–100 | screen | $21.15–$19.87 | $15.50–$14.22 | $8.84–$10.12 | screen | $18.05–$16.77 | $13.85–$12.57 | $8.94–$10.22 |
| Cheers to You Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 2 (redrawn) + 3 (redrawn) | 1–24 | digital | $21.12 | $14.06 | $8.87 | digital | $18.02 | $12.41 | $8.97 |
|  | 2 (redrawn) + 3 (redrawn) | 25–49 | digital | $21.12 | $14.06 | $8.87 | digital | $18.02 | $12.41 | $8.97 |
|  | 2 (redrawn) + 3 (redrawn) | 50–100 | digital | $21.12 | $14.06 | $8.87 | digital | $18.02 | $12.41 | $8.97 |
| You're Not Alone Hoodie<br>Premium AS Colour Stencil Hood, $23.00, retail $79.99<br>Standard Independent Trading IND4000, $17.35, retail $68.99 | 1 + 1 | 1–24 | digital→screen | $56.29–$55.74 | $31.64–$32.74 | $23.70–$24.25 | digital→screen | $45.29–$44.74 | $26.29–$27.39 | $23.70–$24.25 |
|  | 1 + 1 | 25–49 | screen | $55.58–$53.76 | $32.58–$30.76 | $24.41–$26.23 | screen | $44.58–$42.76 | $27.23–$25.41 | $24.41–$26.23 |
|  | 1 + 1 | 50–100 | screen | $53.72–$52.79 | $30.72–$29.79 | $26.27–$27.20 | screen | $42.72–$41.79 | $25.37–$24.44 | $26.27–$27.20 |
| Sue's Gift Logo Hoodie<br>Premium AS Colour Stencil Hood, $23.00, retail $79.99<br>Standard Independent Trading IND4000, $17.35, retail $68.99 | 3 (redrawn) + 3 (redrawn) | 1–24 | digital | $56.26 | $31.63 | $23.73 | digital | $45.26 | $26.28 | $23.73 |
|  | 3 (redrawn) + 3 (redrawn) | 25–49 | digital | $56.26 | $31.63 | $23.73 | digital | $45.26 | $26.28 | $23.73 |
|  | 3 (redrawn) + 3 (redrawn) | 50–100 | digital | $56.26 | $31.63 | $23.73 | digital | $45.26 | $26.28 | $23.73 |
| Be Ovary Aware 2027 Hoodie<br>Premium AS Colour Stencil Hood, $23.00, retail $79.99<br>Standard Independent Trading IND4000, $17.35, retail $68.99 | 1 + 1 | 1–24 | digital→screen | $61.56–$55.74 | $34.28–$32.74 | $18.43–$24.25 | digital→screen | $50.56–$44.74 | $28.93–$27.39 | $18.43–$24.25 |
|  | 1 + 1 | 25–49 | screen | $55.58–$53.76 | $32.58–$30.76 | $24.41–$26.23 | screen | $44.58–$42.76 | $27.23–$25.41 | $24.41–$26.23 |
|  | 1 + 1 | 50–100 | screen | $53.72–$52.79 | $30.72–$29.79 | $26.27–$27.20 | screen | $42.72–$41.79 | $25.37–$24.44 | $26.27–$27.20 |
| Sue's Gift Carrie Tote<br>Premium AS Colour Carrie Tote, $6.90, retail $24.99<br>Standard Liberty Bags 8501 Katelyn, $3.21, retail $17.99 | 4 (redrawn) | 1–24 | digital | $19.13 | $10.56 | $5.86 | digital | $11.75 | $6.87 | $6.24 |
|  | 4 (redrawn) | 25–49 | digital | $19.13 | $10.56 | $5.86 | digital | $11.75 | $6.87 | $6.24 |
|  | 4 (redrawn) | 50–100 | digital | $19.13 | $10.56 | $5.86 | digital | $11.75 | $6.87 | $6.24 |

## Delivery

- Delivery is ship-to-door only (Alex, 2026-11-27). Add store or event pickup only for a real store that wants to hand garments out.

## Remaking the artwork

```
python3 site-src/stores/suesgift/tools/art.py <folder of TTFs>
```

The folder needs Literata-400.ttf, Literata-400i.ttf, Literata-600.ttf and Montserrat-700/800/900.ttf. It reads `tools/src/sues-gift-logo.png` and writes both versions of every design into `images/art/`.

## Going live

Merging this to main deploys the page through Netlify at `/suesgift` (unlisted). Only share the link once Alex has OK'd it.

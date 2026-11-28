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

ARK's price behind each item by order quantity, from `node site-src/stores/tools/cost-table.mjs <ark-designer> site-src/stores/suesgift site-src/stores/suesgift/pricing` (2026-11-28; also in `pricing/pricing.csv` and `pricing/pricing.pdf`). It is for Alex only and never goes on the page or to the client: the client's copy, without ARK's margin, is `pricing/client-pricing.pdf` and `.csv`. Prices use the quote form's rules as ark-designer carries them (`shared/creatorPricing.ts`, `PRICE_RULES_V2`): digital is DTF film at the gang-sheet rate, 1–23 pieces is digital, and from 24 pieces the table uses screen print wherever it's allowed, even where digital would be cheaper. Alex's color limit sits on top of the quote form's: at most 3 colors in total (all locations) up to 40 pieces, 4 for 41–49, 6 a location from 50. Margins show as dollars and percent of ARK's price. ARK margin is that price less the blank's landed cost (wholesale + $0.25 for ink, emulsion and the like) plus, for digital, the film's raw cost, or, for screen print, press labor per impression: $25 an hour ÷ (100 impressions an hour × 30% of the hour on press) ≈ $0.83 (Alex's shop model, 2026-11-28; set-up sits inside the other 70%). Digital press time and shop overhead aren't costed. Screen print is priced off cost (Alex, 2026-11-28): the landed blank marked up 100%, plus each impression at its labor cost ($0.83, no markup), plus the quote form's set-up charge ($35 a screen + $23 admin) spread over the run, so bigger runs cost less a piece. Digital stays at the quote form's price. Tiers are 1–23 (digital), 24–49 and 50–100 (screen print), each shown at its top end: the price at 23, 49 and 100 pieces (Alex, 2026-11-28; the CSV also has the bottom end). A print the designer's color detection reads as full color (the Sue's Gift mark's shaded heart and ring) shows its `spotColours` count, "redrawn": the colors it would take redrawn in flat spot colors, for screen print.

Every product is priced on two garment tiers (`site-src/stores/tiers.mjs`): Premium, the AS Colour blank the store shows, and Standard, ARK's mid-range blank at a lower suggested retail set so Sue's Gift keeps about the same per item.

| Product | Ink colors | Qty | Premium: method | ARK price | ARK margin | Org keeps | Standard: method | ARK price | ARK margin | Org keeps |
|---|---|---|---|---|---|---|---|---|---|---|
| You're Not Alone Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 1 + 1 | 1–23 | digital | $22.08 | $14.29 (65%) | $7.91 | digital | $18.98 | $12.64 (67%) | $8.01 |
|  | 1 + 1 | 24–49 | screen | $15.36 | $7.80 (51%) | $14.63 | screen | $12.46 | $6.35 (51%) | $14.53 |
|  | 1 + 1 | 50–100 | screen | $14.40 | $6.83 (47%) | $15.59 | screen | $11.50 | $5.38 (47%) | $15.49 |
| Be Ovary Aware 2027 Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 1 (redrawn) + 1 (redrawn) | 1–23 | digital | $26.86 | $16.68 (62%) | $3.13 | digital | $23.76 | $15.03 (63%) | $3.23 |
|  | 1 (redrawn) + 1 (redrawn) | 24–49 | screen | $15.36 | $7.80 (51%) | $14.63 | screen | $12.46 | $6.35 (51%) | $14.53 |
|  | 1 (redrawn) + 1 (redrawn) | 50–100 | screen | $14.40 | $6.83 (47%) | $15.59 | screen | $11.50 | $5.38 (47%) | $15.49 |
| Sue's Gift Logo Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 3 (redrawn) + 3 (redrawn) | 1–23 | digital | $21.38 | $13.94 (65%) | $8.61 | digital | $18.28 | $12.29 (67%) | $8.71 |
|  | 3 (redrawn) + 3 (redrawn) | 24–49 | digital | $21.38 | $13.94 (65%) | $8.61 | digital | $18.28 | $12.29 (67%) | $8.71 |
|  | 3 (redrawn) + 3 (redrawn) | 50–100 | screen | $19.13 | $8.23 (43%) | $10.86 | screen | $16.23 | $6.78 (42%) | $10.76 |
| TEAL Tee-Off Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 1 + 2 | 1–23 | digital | $24.06 | $15.28 (64%) | $5.93 | digital | $20.96 | $13.63 (65%) | $6.03 |
|  | 1 + 2 | 24–49 | screen | $16.91 | $8.51 (50%) | $13.08 | screen | $14.01 | $7.06 (50%) | $12.98 |
|  | 1 + 2 | 50–100 | screen | $15.58 | $7.18 (46%) | $14.41 | screen | $12.68 | $5.73 (45%) | $14.31 |
| Cheers to You Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 2 (redrawn) + 3 (redrawn) | 1–23 | digital | $21.12 | $13.81 (65%) | $8.87 | digital | $18.02 | $12.16 (67%) | $8.97 |
|  | 2 (redrawn) + 3 (redrawn) | 24–49 | digital | $21.12 | $13.81 (65%) | $8.87 | digital | $18.02 | $12.16 (67%) | $8.97 |
|  | 2 (redrawn) + 3 (redrawn) | 50–100 | screen | $17.95 | $7.88 (44%) | $12.04 | screen | $15.05 | $6.43 (43%) | $11.94 |
| You're Not Alone Hoodie<br>Premium AS Colour Stencil Hood, $23.00, retail $79.99<br>Standard Independent Trading IND4000, $17.35, retail $68.99 | 1 + 1 | 1–23 | digital | $56.29 | $31.39 (56%) | $23.70 | digital | $45.29 | $26.04 (58%) | $23.70 |
|  | 1 + 1 | 24–49 | screen | $50.06 | $25.15 (50%) | $29.93 | screen | $38.76 | $19.50 (50%) | $30.23 |
|  | 1 + 1 | 50–100 | screen | $49.10 | $24.18 (49%) | $30.89 | screen | $37.80 | $18.53 (49%) | $31.19 |
| Sue's Gift Logo Hoodie<br>Premium AS Colour Stencil Hood, $23.00, retail $79.99<br>Standard Independent Trading IND4000, $17.35, retail $68.99 | 3 (redrawn) + 3 (redrawn) | 1–23 | digital | $56.26 | $31.38 (56%) | $23.73 | digital | $45.26 | $26.03 (58%) | $23.73 |
|  | 3 (redrawn) + 3 (redrawn) | 24–49 | digital | $56.26 | $31.38 (56%) | $23.73 | digital | $45.26 | $26.03 (58%) | $23.73 |
|  | 3 (redrawn) + 3 (redrawn) | 50–100 | screen | $53.83 | $25.58 (48%) | $26.16 | screen | $42.53 | $19.93 (47%) | $26.46 |
| Be Ovary Aware 2027 Hoodie<br>Premium AS Colour Stencil Hood, $23.00, retail $79.99<br>Standard Independent Trading IND4000, $17.35, retail $68.99 | 1 + 1 | 1–23 | digital | $61.56 | $34.03 (55%) | $18.43 | digital | $50.56 | $28.68 (57%) | $18.43 |
|  | 1 + 1 | 24–49 | screen | $50.06 | $25.15 (50%) | $29.93 | screen | $38.76 | $19.50 (50%) | $30.23 |
|  | 1 + 1 | 50–100 | screen | $49.10 | $24.18 (49%) | $30.89 | screen | $37.80 | $18.53 (49%) | $31.19 |
| Sue's Gift Carrie Tote<br>Premium AS Colour Carrie Tote, $6.90, retail $24.99<br>Standard Liberty Bags 8501 Katelyn, $3.21, retail $17.99 | 4 (redrawn) | 1–23 | digital | $19.13 | $10.31 (54%) | $5.86 | digital | $11.75 | $6.62 (56%) | $6.24 |
|  | 4 (redrawn) | 24–49 | screen | $20.96 | $10.48 (50%) | $4.03 | screen | $13.58 | $6.79 (50%) | $4.41 |
|  | 4 (redrawn) | 50–100 | screen | $19.26 | $8.78 (46%) | $5.73 | screen | $11.88 | $5.09 (43%) | $6.11 |

## Delivery

- Delivery is ship-to-door only (Alex, 2026-11-27). Add store or event pickup only for a real store that wants to hand garments out.

## Remaking the artwork

```
python3 site-src/stores/suesgift/tools/art.py <folder of TTFs>
```

The folder needs Literata-400.ttf, Literata-400i.ttf, Literata-600.ttf and Montserrat-700/800/900.ttf. It reads `tools/src/sues-gift-logo.png` and writes both versions of every design into `images/art/`.

## Going live

Merging this to main deploys the page through Netlify at `/suesgift` (unlisted). Only share the link once Alex has OK'd it.

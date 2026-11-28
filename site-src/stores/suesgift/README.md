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

ARK's price behind each item by order quantity, from `node site-src/stores/tools/cost-table.mjs <ark-designer> site-src/stores/suesgift site-src/stores/suesgift/pricing` (2026-11-28; also in `pricing/pricing.csv` and `pricing/pricing.pdf`). It is for Alex only and never goes on the page or to the client: the client's copy, without ARK's margin, is `pricing/client-pricing.pdf` and `.csv`. Prices use the quote form's rules as ark-designer carries them (`shared/creatorPricing.ts`, `PRICE_RULES_V2`): digital is DTF film at the gang-sheet rate, and at each quantity the table shows both methods' price and margin, the cheaper in bold (org keeps uses the cheaper). ARK margin is that price less the blank's wholesale cost and the film's raw cost; press, impression, screen and admin fees count as margin. Tiers are 1–24, 25–49 and 50–100, each shown as one flat number: the average of its smallest and largest order (Alex, 2026-11-28; both ends are in the CSV). A print the designer's color detection reads as full color (the Sue's Gift mark's shaded heart and ring) shows its `spotColours` count, "redrawn": the colors it would take redrawn in flat spot colors, for screen print.

Every product is priced on two garment tiers (`site-src/stores/tiers.mjs`): Premium, the AS Colour blank the store shows, and Standard, ARK's mid-range blank at a lower suggested retail set so Sue's Gift keeps about the same per item.

| Product | Ink colors | Qty | Premium: digital | margin | screen | margin | org keeps | Standard: digital | margin | screen | margin | org keeps |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| You're Not Alone Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 1 + 1 | 1–24 | $22.08 | $14.54 | **$21.04** (24) | **$15.39** (24) | $8.43 | $18.98 | $12.89 | **$17.93** (24) | **$13.73** (24) | $8.54 |
|  | 1 + 1 | 25–49 | $22.08 | $14.54 | **$19.97** | **$14.32** | $10.02 | $18.98 | $12.89 | **$16.87** | **$12.67** | $10.12 |
|  | 1 + 1 | 50–100 | $22.08 | $14.54 | **$18.55** | **$12.90** | $11.43 | $18.98 | $12.89 | **$15.46** | **$11.25** | $11.53 |
| Be Ovary Aware 2027 Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 1 (redrawn) + 1 (redrawn) | 1–24 | $26.86 | $16.93 | **$21.04** (24) | **$15.39** (24) | $6.04 | $23.76 | $15.28 | **$17.93** (24) | **$13.73** (24) | $6.14 |
|  | 1 (redrawn) + 1 (redrawn) | 25–49 | $26.86 | $16.93 | **$19.97** | **$14.32** | $10.02 | $23.76 | $15.28 | **$16.87** | **$12.67** | $10.12 |
|  | 1 (redrawn) + 1 (redrawn) | 50–100 | $26.86 | $16.93 | **$18.55** | **$12.90** | $11.43 | $23.76 | $15.28 | **$15.46** | **$11.25** | $11.53 |
| Sue's Gift Logo Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 3 (redrawn) + 3 (redrawn) | 1–24 | **$21.38** | **$14.19** | $31.00 (24) | $25.35 (24) | $8.61 | **$18.28** | **$12.54** | $27.90 (24) | $23.70 (24) | $8.71 |
|  | 3 (redrawn) + 3 (redrawn) | 25–49 | **$21.38** | **$14.19** | $28.33 | $22.68 | $8.61 | **$18.28** | **$12.54** | $25.23 | $21.03 | $8.71 |
|  | 3 (redrawn) + 3 (redrawn) | 50–100 | **$21.38** | **$14.19** | $24.79 | $19.13 | $8.61 | **$18.28** | **$12.54** | $21.69 | $17.48 | $8.71 |
| TEAL Tee-Off Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 1 + 2 | 1–24 | $24.06 | $15.53 | **$23.92** (24) | **$18.27** (24) | $6.00 | $20.96 | $13.88 | **$20.82** (24) | **$16.62** (24) | $6.10 |
|  | 1 + 2 | 25–49 | $24.06 | $15.53 | **$22.45** | **$16.80** | $7.54 | $20.96 | $13.88 | **$19.36** | **$15.16** | $7.63 |
|  | 1 + 2 | 50–100 | $24.06 | $15.53 | **$20.51** | **$14.86** | $9.48 | $20.96 | $13.88 | **$17.41** | **$13.21** | $9.58 |
| Cheers to You Tee<br>Premium AS Colour Staple Tee, $5.65, retail $29.99<br>Standard Next Level 3600, $4.20, retail $26.99 | 2 (redrawn) + 3 (redrawn) | 1–24 | **$21.12** | **$14.06** | $28.64 (24) | $22.99 (24) | $8.87 | **$18.02** | **$12.41** | $25.54 (24) | $21.34 (24) | $8.97 |
|  | 2 (redrawn) + 3 (redrawn) | 25–49 | **$21.12** | **$14.06** | $26.37 | $20.72 | $8.87 | **$18.02** | **$12.41** | $23.27 | $19.07 | $8.97 |
|  | 2 (redrawn) + 3 (redrawn) | 50–100 | **$21.12** | **$14.06** | $23.36 | $17.71 | $8.87 | **$18.02** | **$12.41** | $20.26 | $16.06 | $8.97 |
| You're Not Alone Hoodie<br>Premium AS Colour Stencil Hood, $23.00, retail $79.99<br>Standard Independent Trading IND4000, $17.35, retail $68.99 | 1 + 1 | 1–24 | $56.29 | $31.64 | **$55.74** (24) | **$32.74** (24) | $23.97 | $45.29 | $26.29 | **$44.74** (24) | **$27.39** (24) | $23.97 |
|  | 1 + 1 | 25–49 | $56.29 | $31.64 | **$54.67** | **$31.67** | $25.32 | $45.29 | $26.29 | **$43.67** | **$26.32** | $25.32 |
|  | 1 + 1 | 50–100 | $56.29 | $31.64 | **$53.25** | **$30.25** | $26.73 | $45.29 | $26.29 | **$42.25** | **$24.90** | $26.73 |
| Sue's Gift Logo Hoodie<br>Premium AS Colour Stencil Hood, $23.00, retail $79.99<br>Standard Independent Trading IND4000, $17.35, retail $68.99 | 3 (redrawn) + 3 (redrawn) | 1–24 | **$56.26** | **$31.63** | $65.70 (24) | $42.70 (24) | $23.73 | **$45.26** | **$26.28** | $54.70 (24) | $37.35 (24) | $23.73 |
|  | 3 (redrawn) + 3 (redrawn) | 25–49 | **$56.26** | **$31.63** | $63.03 | $40.03 | $23.73 | **$45.26** | **$26.28** | $52.03 | $34.68 | $23.73 |
|  | 3 (redrawn) + 3 (redrawn) | 50–100 | **$56.26** | **$31.63** | $59.48 | $36.48 | $23.73 | **$45.26** | **$26.28** | $48.48 | $31.13 | $23.73 |
| Be Ovary Aware 2027 Hoodie<br>Premium AS Colour Stencil Hood, $23.00, retail $79.99<br>Standard Independent Trading IND4000, $17.35, retail $68.99 | 1 + 1 | 1–24 | $61.56 | $34.28 | **$55.74** (24) | **$32.74** (24) | $21.34 | $50.56 | $28.93 | **$44.74** (24) | **$27.39** (24) | $21.34 |
|  | 1 + 1 | 25–49 | $61.56 | $34.28 | **$54.67** | **$31.67** | $25.32 | $50.56 | $28.93 | **$43.67** | **$26.32** | $25.32 |
|  | 1 + 1 | 50–100 | $61.56 | $34.28 | **$53.25** | **$30.25** | $26.73 | $50.56 | $28.93 | **$42.25** | **$24.90** | $26.73 |
| Sue's Gift Carrie Tote<br>Premium AS Colour Carrie Tote, $6.90, retail $24.99<br>Standard Liberty Bags 8501 Katelyn, $3.21, retail $17.99 | 4 (redrawn) | 1–24 | **$19.13** | **$10.56** | — | — | $5.86 | **$11.75** | **$6.87** | — | — | $6.24 |
|  | 4 (redrawn) | 25–49 | **$19.13** | **$10.56** | $22.32 (49) | $15.42 (49) | $5.86 | **$11.75** | **$6.87** | $14.94 (49) | $11.73 (49) | $6.24 |
|  | 4 (redrawn) | 50–100 | **$19.13** | **$10.56** | $21.44 | $14.54 | $5.86 | **$11.75** | **$6.87** | $14.05 | $10.85 | $6.24 |

## Delivery

- Delivery is ship-to-door only (Alex, 2026-11-27). Add store or event pickup only for a real store that wants to hand garments out.

## Remaking the artwork

```
python3 site-src/stores/suesgift/tools/art.py <folder of TTFs>
```

The folder needs Literata-400.ttf, Literata-400i.ttf, Literata-600.ttf and Montserrat-700/800/900.ttf. It reads `tools/src/sues-gift-logo.png` and writes both versions of every design into `images/art/`.

## Going live

Merging this to main deploys the page through Netlify at `/suesgift` (unlisted). Only share the link once Alex has OK'd it.

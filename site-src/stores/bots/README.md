# Best of the Springs store (sample)

`https://arkscreenprinting.com/best-of-the-springs`: tees and totes for The Gazette's Best of the Springs, built from Alex's six proofs for The Gazette to review. It's a **sample**: the bag works and adds up pickup or shipping, but there's no checkout, and the page makes no requests at all. The page is unlisted (`noindex`).

| What | File |
|---|---|
| Products, colours, prices, print placements, delivery options | `catalog.mjs` |
| The handling fee and shipping rule every store uses | `../rules.mjs` ([rules](../README.md)) |
| The page (React) | `app.jsx`, `icons.jsx`, `styles.css` |
| Draws a garment in any colour, with its prints | `render.js` |
| Garment templates, made from AS Colour's photos | `images/garments/`, made by `tools/garment-maps.mjs` |
| Print artwork, made from The Gazette's logo files | `images/art/`, made by `tools/art.mjs` |
| Fonts: Noto Serif Display, Noto Serif, Open Sans (SIL OFL) | `fonts/` |
| Bundles everything into `ark-site-review/best-of-the-springs.html` | `build.mjs` (run by `npm run build`) |
| Tests | `tests/` (`npm test`) |

## The products

Each is one of Alex's proofs, with the print sizes and placements from it.

| Product | Garment | Front | Back |
|---|---|---|---|
| Best of the Springs 2027 Tee | AS Colour Staple Tee 5001 | 2027 logo, left chest, 5.1″ × 4.9″ | 2027 logo, 13.3″ × 12.9″ |
| 2026 Winner Tee | Staple Tee 5001 | Winner logo, left chest, 6.5″ × 3.7″ | Winner logo, 15.5″ × 8.7″ |
| 2026 Winner Badge Tee | Staple Tee 5001 | Winner badge, left chest, 5.9″ × 3.4″ | Winner badge, 15.3″ × 8.8″ |
| Defend the Crown Tee | Staple Tee 5001 | Winner logo, left chest, 5.9″ × 3.3″ | 2027 logo, 13.3″ × 12.9″ |
| Best of the Springs Carrie Tote | AS Colour Carrie Tote 1001 | 2027 logo, 9.5″ × 9.2″ | Winner logo, 11.2″ × 6.3″ |
| Best of the Springs Two-Tone Tote | AS Colour Two-Tone Carrie Tote 1008 | 2027 logo, 5.6″ × 5.5″ | Winner logo, 6.8″ × 3.8″ |

Every product comes in every colour its garment does: 75 Staple Tee colours, 23 Carrie Tote colours and 5 Two-Tone Carrie colourways, with AS Colour's names and swatch colours.

## How a colour is drawn

There's one photo per garment side, not one per colour. `tools/garment-maps.mjs` takes AS Colour's white and black photos of the same garment and works out, per pixel, how lit the fabric is (*shade*) and what light a black garment still reflects (*sheen*). Any colour is then `colour × shade + sheen`, which is how AS Colour's own photos of other colours come out. The two-tone tote also gets a *trim* map that marks its straps, from its cream/black and black/cream photos. The tee's neck label is cut out on its own, since it's the same in every colour.

`render.js` draws those maps in the browser, with the print mixed into the colour before the shading, so the folds run through the ink. Heathered colours (Athletic Heather, Granite) get a fine knit texture.

On light garments (white, cream, pastels, light greys and yellows: white ink would barely show) the white lettering of the 2027 and Winner logos prints in the logo's plum, and the gold's near-white highlights stop at a light gold. The black Winner badge prints the same on every colour. `isLightGarment()` in `catalog.mjs` decides which colours those are.

## To confirm with The Gazette before launch

- **Prices** (sample): tees $29.99, 2XL–3XL $32.99, 4XL–5XL $34.99; Carrie Tote $24.99; Two-Tone Carrie $29.99. Edit `PRICE_CENTS` and `SIZE_UPCHARGE_CENTS`.
- **Event pickup**: the page says "a Best of the Springs event". Edit `DELIVERY.event`.
- **Product names and descriptions**: `PRODUCTS`.
- **Gold on gold garments**: on Mustard, Gold and similar colours the gold crown and *WINNER* are faint. A one-colour plum print for those would read better.

Store pickup at 4852 Saddle Ridge Dr, event pickup, and shipping at $4.50 handling plus $8 for the first item and $3 for each additional one (at most $39.50) are every store's options (Alex, 2026-11-18).

## Going live

1. Add a checkout the way the RMPC store does (`../rmpc/README.md`): a Netlify function that re-prices the bag from `catalog.mjs` and opens Stripe Checkout.
2. Set `STORE.sample` to `false` and switch the bag's checkout button on.
3. In `site-src/build.mjs`, give `/best-of-the-springs` `connect-src 'self'` so the page can reach its checkout, and update the check in `site-src/check.mjs`.

## Common changes

- **Move or resize a print**: its `box` in `PRODUCTS` is `[left, top, width]` on the garment's 1000px canvas, and its height follows the artwork. The tee is about 26px to the inch, the totes about 33.
- **New artwork from The Gazette**: `node site-src/stores/bots/tools/art.mjs <official.png> <2027.png> <winner.png> <badge.png>` (the official plum-background logo, then the no-background 2027 logo, the no-background Winner logo and the Winner badge). It rewrites `images/art/`.
- **Rebuild a garment template**: put AS Colour's photos in a folder (the names are in `tools/garment-maps.mjs`) and run `node site-src/stores/bots/tools/garment-maps.mjs <folder>`.

Then run `npm run build` and commit the rebuilt page, since CI checks it's current.

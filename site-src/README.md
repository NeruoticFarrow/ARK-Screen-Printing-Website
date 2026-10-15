# site-src: how arkscreenprinting.com is built

The pages in `ark-site-review/` (the folder Netlify publishes) are **generated**. Edit the sources here, run the build and commit both.

```bash
npm install        # once: linkedom and sharp, for the migration and image tools
npm run build      # writes every page plus assets/site.css and assets/site.js
npm run check      # one H1, links and images resolve, SEO fields kept, analytics present
npm run images     # after adding a photo: WebP sizes + content/image-manifest.json
```

> ⚠️ **Don't hand-edit the generated `.html` files.** The next build overwrites them. Edit the content or template instead.

## Where things live

| What | File |
|---|---|
| Facts every page states: phone, address, hours, minimums, turnaround, Google rating | `lib/facts.mjs` |
| Photos the templates choose (real ARK work only) | `lib/media.mjs` |
| Look and feel: Verdara tokens, type, buttons, tiles | `lib/styles-base.mjs` (ported from the Studio pages), `lib/styles.mjs` (site additions) |
| Header, footer, `<head>` and analytics | `lib/layout.mjs` |
| Shared sections: hero art, rules tile, steps, reviews, quote band | `lib/components.mjs` |
| Home page | `pages/home.mjs` |
| Service and paid-search pages | `pages/service.mjs` + `content/services.mjs` |
| Local pages (towns and Colorado Springs areas) | `pages/local.mjs` |
| About, FAQ, gallery, reviews, areas, quote, thank-you | `pages/simple.mjs` |
| Each page's own title, description, H1, local copy, FAQs and structured data | `content/pages/<slug>.json` (migrated once from the old pages by `migrate/extract.mjs`) |
| Reviews shown on the site (the owner's picks of real Google reviews) | `content/reviews.json` |
| The Google Ads conversion bridge and the thank-you conversion tags (byte for byte from the old site) | `content/conversion-bridge.js`, `content/thank-you-conversions.json` |
| The browser script | `assets/site.js` |

## Rules the templates follow

These come from the UX/CRO knowledge base in the ark-designer repo (`docs/knowledge/ux-cro/`, chapters 25 §11, 12 §4.5, 20 and 07).

- **Every page keeps its URL and SEO fields.** It keeps its title, description, canonical, robots, H1 and structured data. `npm run check` enforces this.
- **First screen:** the service and the city in the H1 or lead, then **Get an instant quote**, **Call or text**, and the Google rating.
- **Local proof in plain sight:** rating, street address, hours, call and text.
- **Rules stated with the reason,** and the proof shown before the customer commits.
- **Paid-search pages (`*-ppc`, `custom-work-shirts`):**
  - noindex, no navigation;
  - the form on the page and the FAQ open;
  - a phone sticky CTA.
- **Real photos only.** No stock in the templates; no placeholder people.
- **Motion:**
  - the hero collage settles once and drifts on desktop;
  - the audience strip has a pause button;
  - everything is still under `prefers-reduced-motion`;
  - no preloaders.
- **Analytics are unchanged:** GA4 and the Ads config on every page, the quote-form conversion bridge, and the thank-you conversions. `site.js` also passes gclid/gbraid/wbraid/fbclid/UTM tags into the quote form, and records calls, texts and CTA clicks as analytics events (not as conversions).

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
| Reviews shown on the site: the owner's picks of real Google reviews, in the two-row ticker on every page with a reviews section | `content/reviews.json` |
| Live reviews on the Reviews page: the newest Google reviews from the owner's Starwall feed, read fresh in the browser by `assets/site.js` (never stored, per Google's terms); `""` turns it off and the picks above show instead | `REVIEWS_FEED` in `lib/facts.mjs` |
| The Google Ads conversion bridge and the thank-you conversion tags (byte for byte from the old site) | `content/conversion-bridge.js`, `content/thank-you-conversions.json` |
| The browser script | `assets/site.js` |

## Google reviews and photos (Business Profile sync)

**How it works:**
- Each Netlify deploy runs `npm run netlify-build` (see `netlify.toml`), which pulls three things from the shop's Google Business Profile:
  - the **rating and review count**;
  - **every review, newest first, every star rating**;
  - **the photos you uploaded**. Customer photos are never fetched; they're the customer's copyright.
- `.github/workflows/weekly-rebuild.yml` triggers a deploy every Monday, so the site stays current.
- **Google's API rules allow only temporary copies (30 days at most).** So synced data lives in git-ignored folders (`site-src/.cache/`, `ark-site-review/images/gbp/`), is rebuilt on every deploy, and is never committed.
- Without credentials, or if Google is down, the site shows the committed reviews (`content/reviews.json`) and the last values in `lib/facts.mjs`.

**One-time setup (owner):**

1. **Request API access.** Use Google's [Business Profile API contact form](https://support.google.com/business/contact/api_default) and choose *Application for Basic API Access*.
   - Send it from an email that owns or manages the profile.
   - Google needs the profile verified for 60+ days, with the website listed on it.
   - Until approval, the API quota shows 0 in Google Cloud.
2. **Set up a Google Cloud project.** In [Google Cloud](https://console.cloud.google.com/), create a project and enable the Business Profile APIs:
   - *My Business Account Management API*;
   - *My Business Business Information API*;
   - *Google My Business API*.
3. **Create an OAuth client.**
   - Under *APIs & Services → OAuth consent screen*, set the app to **In production**. Testing-mode tokens expire after 7 days.
   - Under *Credentials*, create an **OAuth client ID** of type **Desktop app**.
4. **Get the remaining values.** On your own computer, in this repo, run:
   ```powershell
   $env:GBP_CLIENT_ID="…"; $env:GBP_CLIENT_SECRET="…"; npm run gbp:auth
   ```
   Then sign in with the Google account that owns the profile. The terminal prints `GBP_REFRESH_TOKEN`, `GBP_ACCOUNT_ID` and `GBP_LOCATION_ID`.
5. **Add the values to Netlify.** Put all five `GBP_*` values in *Site configuration → Environment variables*. Never put them in a file in this repo.
6. **Schedule the weekly rebuild.**
   - In Netlify, go to *Build & deploy → Build hooks* and add a hook for `main`.
   - Save its URL as the GitHub repository secret `NETLIFY_BUILD_HOOK`.
7. **Check the base directory.** Make sure Netlify's *Base directory* is empty, because `netlify.toml` lives at the repo root.

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

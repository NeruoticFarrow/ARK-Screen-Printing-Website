// The Business Profile copy written by sync/gbp-sync.mjs, if there is one and
// it's under 30 days old (Google's limit on keeping API content). Null means
// "use the committed content" — the site never depends on the sync.

import fs from "node:fs";

const CACHE = new URL("../.cache/gbp.json", import.meta.url);
const GBP_MANIFEST = new URL("../.cache/gbp-image-manifest.json", import.meta.url);
const MAX_AGE_DAYS = 30;

let memo;
export function gbpData() {
  if (memo !== undefined) return memo;
  memo = null;
  if (!fs.existsSync(CACHE)) return memo;
  const data = JSON.parse(fs.readFileSync(CACHE, "utf8"));
  const age = (Date.now() - Date.parse(data.fetchedAt)) / 86_400_000;
  if (!(age >= 0 && age <= MAX_AGE_DAYS)) return memo;
  memo = data;
  return memo;
}

/** Image-manifest entries for the synced photos (see images.mjs). */
export function gbpImageManifest() {
  return gbpData() && fs.existsSync(GBP_MANIFEST) ? JSON.parse(fs.readFileSync(GBP_MANIFEST, "utf8")) : {};
}

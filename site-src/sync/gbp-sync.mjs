// Pulls the shop's Google rating, reviews and owner-uploaded photos from the
// Business Profile API at build time (Netlify runs it before every build).
//
// Google's API policy allows only temporary copies (30 days at most), so what
// this writes is never committed: site-src/.cache/ and ark-site-review/images/gbp/
// are git-ignored, rebuilt on each deploy (weekly, via .github/workflows/
// weekly-rebuild.yml) and deleted here once older than 30 days. Without
// credentials it does nothing and the site keeps its committed reviews.
//
// Customer-uploaded photos are not fetched: they're the customer's copyright.
//
// usage: npm run gbp:sync

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { accessToken, credentials, listOwnerMedia, listReviews } from "./google.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const CACHE_DIR = path.join(ROOT, "site-src/.cache");
const CACHE = path.join(CACHE_DIR, "gbp.json");
const PHOTO_DIR = path.join(ROOT, "ark-site-review/images/gbp");
const MAX_AGE_DAYS = 30;
const SKIP_CATEGORIES = new Set(["LOGO", "PROFILE"]);
const STARS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function purgeStale() {
  if (!fs.existsSync(CACHE)) return;
  const { fetchedAt } = JSON.parse(fs.readFileSync(CACHE, "utf8"));
  if ((Date.now() - Date.parse(fetchedAt)) / 86_400_000 <= MAX_AGE_DAYS) return;
  fs.rmSync(CACHE, { force: true });
  fs.rmSync(PHOTO_DIR, { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, "ark-site-review/assets/img/gbp"), { recursive: true, force: true });
  console.log("gbp: removed a copy older than 30 days");
}

/** Google returns translated reviews as "(Translated by Google) … (Original) …";
 *  show the reviewer's own words. */
function originalText(comment) {
  if (!comment) return "";
  const m = comment.match(/\(Original\)\s*([\s\S]+)$/);
  return (m ? m[1] : comment.replace(/\(Translated by Google\)\s*/, "")).trim();
}

const safeId = (name) => name.split("/").pop().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);

async function main() {
  purgeStale();
  const c = credentials();
  if (c.missing.length) {
    console.log(`gbp: sync off (no ${c.missing.join(", ")}) — the site keeps its committed reviews`);
    return;
  }
  const token = await accessToken(c);
  const { averageRating, totalReviewCount, reviews } = await listReviews(c, token);
  const media = await listOwnerMedia(c, token);

  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  const photos = [];
  for (const m of media) {
    if (m.mediaFormat !== "PHOTO" || !m.googleUrl) continue;
    const category = m.locationAssociation?.category ?? "ADDITIONAL";
    if (SKIP_CATEGORIES.has(category)) continue;
    const id = safeId(m.name);
    const file = path.join(PHOTO_DIR, `${id}.jpg`);
    if (!fs.existsSync(file)) {
      const res = await fetch(m.googleUrl);
      if (!res.ok) { console.warn(`gbp: photo ${id} HTTP ${res.status}, skipped`); continue; }
      await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toFile(file);
    }
    photos.push({ src: `/images/gbp/${id}.jpg`, alt: (m.description ?? "").trim(), category, createTime: m.createTime ?? null });
  }
  photos.sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)));

  const out = {
    fetchedAt: new Date().toISOString(),
    rating: averageRating,
    count: totalReviewCount,
    // Newest first, every rating — never filtered by score (FTC 16 CFR 465).
    reviews: reviews
      .map((r) => ({
        name: r.reviewer?.isAnonymous ? "A Google user" : (r.reviewer?.displayName ?? "A Google user"),
        rating: STARS[r.starRating] ?? null,
        quote: originalText(r.comment),
        date: (r.createTime ?? "").slice(0, 10) || null,
      }))
      .filter((r) => r.rating && r.quote),
    photos,
  };
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(out, null, 2));
  console.log(`gbp: ${out.rating ?? "?"}★ from ${out.count ?? "?"} reviews · ${out.reviews.length} with text · ${photos.length} owner photos`);
}

main().catch((e) => {
  // A Google outage must not block a deploy: keep the last good copy (if it's
  // still under 30 days old) or the committed reviews.
  console.warn(`gbp: sync failed, building without fresh data — ${e.message}`);
});

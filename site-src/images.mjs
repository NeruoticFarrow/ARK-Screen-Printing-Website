// Optimises every photo the pages use: WebP at up to three widths in
// ark-site-review/assets/img/, plus site-src/content/image-manifest.json
// (original path, dimensions, variants). The originals stay where they are as
// the fallback <img>. Re-run after adding a photo; existing variants are kept.
//
// usage: npm run images

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PHOTOS, WORK } from "./lib/media.mjs";
import { imageKey } from "./lib/images.mjs";
import { gbpData } from "./lib/gbp-data.mjs";
import { CATEGORIES, TEE_PHOTOS } from "./lib/studio.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const SITE = path.join(ROOT, "ark-site-review");
const OUT_DIR = path.join(SITE, "assets/img");
const WIDTHS = [480, 960, 1600];

/** Every image src the content and templates reference. */
function referenced() {
  const set = new Set([...Object.values(PHOTOS).map((p) => p.src), ...WORK, ...CATEGORIES.map((c) => c.photo), ...Object.values(TEE_PHOTOS)]);
  const dir = path.join(ROOT, "site-src/content/pages");
  for (const f of fs.readdirSync(dir)) {
    const page = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    if (page.hero?.image?.src) set.add(page.hero.image.src);
    for (const b of page.blocks) for (const m of b.html.matchAll(/<img src="([^"]+)"/g)) set.add(m[1]);
  }
  for (const g of JSON.parse(fs.readFileSync(path.join(ROOT, "site-src/content/gallery.json"), "utf8"))) set.add(g.src);
  return [...set].filter((s) => s.startsWith("/images/") && /\.(jpe?g|png|webp|avif)$/i.test(s));
}

/** Finds the file on disk case-insensitively; returns its real relative path. */
function resolveOnDisk(src) {
  const parts = decodeURIComponent(src).replace(/^\//, "").split("/");
  let dir = SITE;
  const real = [];
  for (const part of parts) {
    const hit = fs.readdirSync(dir).find((n) => n.toLowerCase() === part.toLowerCase());
    if (!hit) return null;
    real.push(hit);
    dir = path.join(dir, hit);
  }
  return real.join("/");
}

const slugFor = (rel) => rel.replace(/^images\//, "").replace(/\.[a-z0-9]+$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

let made = 0;
/** WebP sizes for each src into outDir (served at urlBase); returns manifest entries. */
async function optimise(srcs, outDir, urlBase) {
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = {};
  for (const src of srcs) {
    const rel = resolveOnDisk(src);
    if (!rel) { console.warn(`missing on disk: ${src}`); continue; }
    const file = path.join(SITE, rel);
    const meta = await sharp(file).rotate().metadata();
    const width = meta.autoOrient?.width ?? meta.width;
    const height = meta.autoOrient?.height ?? meta.height;
    const slug = slugFor(rel);
    const variants = [];
    for (const w of WIDTHS.filter((w, i) => w <= width || i === 0)) {
      const target = Math.min(w, width);
      const name = `${slug}-${target}.webp`;
      const out = path.join(outDir, name);
      if (!fs.existsSync(out)) {
        await sharp(file).rotate().resize({ width: target, withoutEnlargement: true }).webp({ quality: 74, effort: 5 }).toFile(out);
        made++;
      }
      variants.push({ width: target, file: `${urlBase}/${name}` });
    }
    manifest[imageKey(src)] = { original: "/" + rel.split("/").map(encodeURIComponent).join("/"), width, height, variants: [...new Map(variants.map((v) => [v.width, v])).values()] };
  }
  return manifest;
}

// Committed photos → assets/img/ and the committed manifest.
const manifest = await optimise(referenced(), OUT_DIR, "/assets/img");
fs.writeFileSync(path.join(ROOT, "site-src/content/image-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

// Business Profile photos synced for this build → git-ignored folders and a
// manifest in site-src/.cache/ (Google allows temporary copies only).
const gbp = gbpData();
let gbpCount = 0;
if (gbp?.photos?.length) {
  const gbpManifest = await optimise(gbp.photos.map((p) => p.src), path.join(OUT_DIR, "gbp"), "/assets/img/gbp");
  fs.writeFileSync(path.join(ROOT, "site-src/.cache/gbp-image-manifest.json"), JSON.stringify(gbpManifest, null, 2));
  gbpCount = Object.keys(gbpManifest).length;
}
console.log(`images: ${Object.keys(manifest).length} in manifest${gbpCount ? ` + ${gbpCount} Business Profile photos` : ""}, ${made} new WebP files`);

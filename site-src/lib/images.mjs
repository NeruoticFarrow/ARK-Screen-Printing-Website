// <picture> markup from the optimised-image manifest (site-src/images.mjs
// writes the WebP sizes and the manifest). An image that isn't in the manifest
// renders as a plain <img> of the original file.

import fs from "node:fs";
import { gbpImageManifest } from "./gbp-data.mjs";
import { esc } from "./html.mjs";

const MANIFEST_URL = new URL("../content/image-manifest.json", import.meta.url);
// Committed photos, plus the Business Profile photos synced for this build.
const manifest = { ...(fs.existsSync(MANIFEST_URL) ? JSON.parse(fs.readFileSync(MANIFEST_URL, "utf8")) : {}), ...gbpImageManifest() };

/** Manifest key: the root-relative path, lower-cased (the old pages linked
 *  some files in a different case than they have on disk). */
export const imageKey = (src) => decodeURIComponent(String(src).replace(/^\.?\//, "/")).toLowerCase();

export function imageInfo(src) {
  return manifest[imageKey(src)] ?? null;
}

/**
 * @param {string} src root-relative original
 * @param {{alt?: string, sizes?: string, priority?: boolean, className?: string}} o
 */
export function picture(src, o = {}) {
  const info = imageInfo(src);
  const alt = esc(o.alt ?? "");
  const cls = o.className ? ` class="${esc(o.className)}"` : "";
  // priority: the page's main image; eager: on screen at once (no lazy wait).
  const loading = o.priority ? ' fetchpriority="high"' : o.eager ? "" : ' loading="lazy"';
  const dims = info ? ` width="${info.width}" height="${info.height}"` : "";
  const original = esc(info?.original ?? src);
  const img = `<img src="${original}"${dims} alt="${alt}"${loading} decoding="async"${cls}>`;
  if (!info?.variants?.length) return img;
  const srcset = info.variants.map((v) => `${esc(v.file)} ${v.width}w`).join(", ");
  return `<picture><source type="image/webp" srcset="${srcset}" sizes="${esc(o.sizes ?? "100vw")}">${img}</picture>`;
}

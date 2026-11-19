// Makes the store's artwork files from the Gazette's logo files:
//
//   node site-src/stores/bots/tools/art.mjs <official.png> <2027.png> <winner.png> <badge.png>
//
//   official  the 2027 logo on its plum background (their official logo)
//   2027      the same logo with no background
//   winner    the 2026 Winner logo with no background
//   badge     the 2026 Winner logo on its black badge
//
// It writes, into ../images/art/:
//   logo-official.webp   the official logo, square, for the page itself
//   logo-2027.webp       the print artwork, trimmed to the ink
//   winner-2026.webp
//   winner-badge.webp
//   logo-2027-plum.webp  the light-garment versions: the white lettering
//   winner-2026-plum.webp  prints in the logo's plum instead, so it reads on
//                          white, cream and pastel garments. The gold crown
//                          and WINNER keep their colours.
//
// The lettering and the gold are told apart by their connected shapes: a
// shape with any gold in it is gold (the gold gradients have pure white
// highlights, so a colour test alone would turn those plum too).

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT = path.join(HERE, "..", "images", "art");
/** The longest side of a print file. The biggest print on a garment is
 *  about 400px of the 1000px canvas, so this stays sharp on a 2x screen. */
const PRINT_SIZE = 640;
const OFFICIAL_SIZE = 640;
/** The logo's plum (its background), used for lettering on light garments. */
const PLUM = [0x59, 0x10, 0x45];
/** On a light garment the gold's near-white highlights would vanish, so they
 *  are pulled toward this light gold instead. */
const HIGHLIGHT_GOLD = [0xd2, 0xae, 0x62];

const [official, logo2027, winner, badge] = process.argv.slice(2);
if (!badge) {
  console.error("usage: node art.mjs <official.png> <2027.png> <winner.png> <badge.png>");
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

async function trimmed(file) {
  // The files are transparent around the ink, so trim() (keyed off the
  // top-left pixel) cuts them to the artwork.
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .trim({ threshold: 1 })
    .resize(PRINT_SIZE, PRINT_SIZE, { fit: "inside", kernel: "lanczos3" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

async function write(name, { data, w, h }) {
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(path.join(OUT, name));
  return { name, size: [w, h] };
}

/** Gold: warm and clearly saturated (the gradients run from deep gold to near
 *  white, so only their coloured parts count). */
const isGold = (r, g, b) => r - b > 45 && g - b > 20 && r >= g;

function plumVersion({ data, w, h }) {
  const n = w * h;
  const solid = new Uint8Array(n);
  for (let i = 0; i < n; i++) solid[i] = data[i * 4 + 3] > 24 ? 1 : 0;
  // Label the connected shapes (8-neighbour) and note which hold gold.
  const label = new Int32Array(n).fill(-1);
  const goldIn = [];
  const sizeOf = [];
  for (let start = 0; start < n; start++) {
    if (!solid[start] || label[start] >= 0) continue;
    const id = goldIn.length;
    let gold = 0;
    let size = 0;
    const stack = [start];
    label[start] = id;
    while (stack.length) {
      const i = stack.pop();
      size++;
      const o = i * 4;
      if (isGold(data[o], data[o + 1], data[o + 2])) gold++;
      const x = i % w;
      const y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (solid[j] && label[j] < 0) {
            label[j] = id;
            stack.push(j);
          }
        }
      }
    }
    goldIn.push(gold);
    sizeOf.push(size);
  }
  const isGoldShape = goldIn.map((g, id) => g > 0.02 * sizeOf[id]);
  // Lettering: every shape without gold, grown by two pixels to take in its
  // soft edge.
  let letter = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (label[i] >= 0 && !isGoldShape[label[i]]) letter[i] = 1;
  for (let pass = 0; pass < 2; pass++) {
    const next = Uint8Array.from(letter);
    for (let i = 0; i < n; i++) {
      if (letter[i]) continue;
      const x = i % w;
      const y = (i / w) | 0;
      if ((x > 0 && letter[i - 1]) || (x < w - 1 && letter[i + 1]) || (y > 0 && letter[i - w]) || (y < h - 1 && letter[i + w])) next[i] = 1;
    }
    letter = next;
  }
  const out = Buffer.from(data);
  let recoloured = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (label[i] >= 0 && isGoldShape[label[i]]) {
      // Gold: keep the gradient, but stop its highlights at a light gold.
      const lightness = Math.min(data[o], data[o + 1], data[o + 2]);
      const t = 0.7 * Math.min(1, Math.max(0, (lightness - 120) / 135));
      for (let c = 0; c < 3; c++) out[o + c] = Math.round(data[o + c] * (1 - t) + HIGHLIGHT_GOLD[c] * t);
      continue;
    }
    if (!letter[i]) continue;
    out[o] = PLUM[0];
    out[o + 1] = PLUM[1];
    out[o + 2] = PLUM[2];
    recoloured++;
  }
  return { data: out, w, h, shapes: goldIn.length, goldShapes: isGoldShape.filter(Boolean).length, recoloured };
}

const report = [];
{
  const square = await sharp(official).resize(OFFICIAL_SIZE, OFFICIAL_SIZE, { fit: "cover" }).webp({ quality: 90, effort: 6 }).toFile(path.join(OUT, "logo-official.webp"));
  const { data } = await sharp(official).resize(8, 8).raw().toBuffer({ resolveWithObject: true });
  report.push({ name: "logo-official.webp", size: [square.width, square.height], corner: `#${[...data.subarray(0, 3)].map((v) => v.toString(16).padStart(2, "0")).join("")}` });
}
for (const [file, name, plum] of [
  [logo2027, "logo-2027", true],
  [winner, "winner-2026", true],
  [badge, "winner-badge", false],
]) {
  const art = await trimmed(file);
  report.push(await write(`${name}.webp`, art));
  if (plum) {
    const light = plumVersion(art);
    report.push({ ...(await write(`${name}-plum.webp`, light)), shapes: light.shapes, goldShapes: light.goldShapes, recoloured: light.recoloured });
  }
}
console.log(JSON.stringify(report, null, 1));

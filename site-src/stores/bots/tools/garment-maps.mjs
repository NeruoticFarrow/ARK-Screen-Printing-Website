// Makes the recolourable garment templates the Best of the Springs store
// draws every colourway from (images/garments/), out of AS Colour's own flat
// product photos (ascolour.com product pages, 1000 px, white background).
//
// AS Colour shoots each garment in the same position in every colour, so a
// light photo and a dark photo of one garment line up. From the pair, each
// pixel's two numbers are solved:
//
//     photo = fabric colour × shade + sheen
//
// `shade` carries the folds and shadows (1 on flat fabric) and `sheen` the
// light a dark fabric gives back (0 on flat fabric). The page (render.js)
// draws any AS Colour colour with the same formula, so a colour with no photo
// still looks like the garment, and the print sits under the same folds.
//
//   node site-src/stores/bots/tools/garment-maps.mjs <folder of AS Colour photos>
//
// The folder holds the photos under AS Colour's own file names (listed in
// JOBS). Writes, per view, <view>-shade.webp (grey = shade / 1.25, alpha = the
// garment) and <view>-sheen.webp (grey = sheen + 32); the Two-Tone Carrie
// Tote also gets <view>-trim.webp (white = strap), and the tee's front its
// neck label, label.webp. Run it only when a garment or its photos change.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT = path.join(HERE, "..", "images", "garments");
const SRC = process.argv[2];
if (!SRC) {
  console.error("usage: node garment-maps.mjs <folder of AS Colour photos>");
  process.exit(1);
}

/** Shade is stored as shade / SHADE_MAX, sheen as sheen + SHEEN_OFFSET.
 *  render.js reads them back with the same two numbers. */
const SHADE_MAX = 1.25;
const SHEEN_OFFSET = 32;

const JOBS = [
  // Staple Tee 5001: the white and black tee, front and back. The chest patch
  // is flat fabric, used to measure each photo's own white and black.
  { view: "tee-front", light: "5001_STAPLE_TEE_WHITE.jpg", dark: "5001_STAPLE_TEE_BLACK.jpg", flat: [400, 450, 600, 650], label: true },
  { view: "tee-back", light: "5001_STAPLE_TEE_WHITE_BACK.jpg", dark: "5001_STAPLE_TEE_BLACK_BACK.jpg", flat: [400, 450, 600, 650] },
  // Carrie Tote 1001: cream and black. One photo of the bag; both sides match.
  { view: "carrie", light: "1001_CARRIE_TOTE_CREAM.jpg", dark: "1001_CARRIE_TOTE_BLACK.jpg", flat: [400, 550, 600, 750] },
  // Two-Tone Carrie Tote 1008: cream with black straps, and black with cream
  // straps, so every pixel has a light and a dark photo, and the straps are
  // where the two disagree.
  { view: "two-tone", swap: ["1008_2-TONE_CARRIE_TOTE_CREAM_BLACK.jpg", "1008_2-TONE_CARRIE_TOTE_BLACK_CREAM.jpg"], flat: [430, 550, 560, 750] },
];

async function load(file) {
  const { data, info } = await sharp(path.join(SRC, file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const grey = new Float32Array(info.width * info.height);
  for (let i = 0; i < grey.length; i++) grey[i] = (data[i * 3] + data[i * 3 + 1] + data[i * 3 + 2]) / 3;
  return { rgb: data, grey, w: info.width, h: info.height };
}

function median(values) {
  const sorted = Float32Array.from(values).sort();
  return sorted[sorted.length >> 1];
}

function patch(grey, w, [x0, y0, x1, y1]) {
  const out = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) out.push(grey[y * w + x]);
  return median(out);
}

/** Binary erosion with the 8 neighbours, `r` times. */
function erode(mask, w, h, r) {
  let cur = mask;
  for (let n = 0; n < r; n++) {
    const next = new Uint8Array(cur.length);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!cur[i]) continue;
        next[i] = cur[i - 1] & cur[i + 1] & cur[i - w] & cur[i + w] & cur[i - w - 1] & cur[i - w + 1] & cur[i + w - 1] & cur[i + w + 1];
      }
    }
    cur = next;
  }
  return cur;
}

/** Binary dilation with the 8 neighbours, `r` times. */
function dilate(mask, w, h, r) {
  let cur = mask;
  for (let n = 0; n < r; n++) {
    const next = Uint8Array.from(cur);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (cur[i]) continue;
        next[i] = cur[i - 1] | cur[i + 1] | cur[i - w] | cur[i + w] | cur[i - w - 1] | cur[i - w + 1] | cur[i + w - 1] | cur[i + w + 1];
      }
    }
    cur = next;
  }
  return cur;
}

/** Marks as garment each patch of backdrop under `maxArea` pixels that the
 *  garment surrounds: a fold the two photos disagree on, not a real gap such
 *  as the space inside a tote's handle. */
function fillHoles(mask, w, h, maxArea) {
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let start = 0; start < w * h; start++) {
    if (mask[start] || seen[start]) continue;
    const region = [];
    let border = false;
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop();
      region.push(i);
      const x = i % w;
      const y = (i / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j < 0 || mask[j] || seen[j]) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    if (!border && region.length < maxArea) for (const i of region) mask[i] = 1;
  }
}

/** Fills the unknown pixels of `inside` from their known neighbours, ring by
 *  ring, so edge pixels (where the two photos don't quite line up) carry the
 *  fabric next to them. */
function fill(values, known, inside, w, h) {
  const k = Uint8Array.from(known);
  for (let pass = 0; pass < 60; pass++) {
    const add = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (k[i] || !inside[i]) continue;
        let sum = 0;
        let n = 0;
        for (const j of [i - 1, i + 1, i - w, i + w, i - w - 1, i - w + 1, i + w - 1, i + w + 1]) {
          if (k[j]) {
            sum += values[j];
            n++;
          }
        }
        if (n) add.push([i, sum / n]);
      }
    }
    if (!add.length) break;
    for (const [i, v] of add) {
      values[i] = v;
      k[i] = 1;
    }
  }
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

async function writeGrey(file, grey, alpha, w, h) {
  const channels = alpha ? 2 : 1;
  const buf = Buffer.alloc(w * h * channels);
  for (let i = 0; i < w * h; i++) {
    buf[i * channels] = clamp(Math.round(grey[i]), 0, 255);
    if (alpha) buf[i * channels + 1] = clamp(Math.round(alpha[i] * 255), 0, 255);
  }
  await sharp(buf, { raw: { width: w, height: h, channels } })
    .webp({ quality: 88, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(path.join(OUT, file));
}

async function run(job) {
  let light;
  let dark;
  let trim = null;
  let alpha;
  const first = await load(job.light ?? job.swap[0]);
  const { w, h } = first;
  if (job.swap) {
    // a = cream body, black straps; b = black body, cream straps.
    const a = first;
    const b = await load(job.swap[1]);
    const lightFlat = patch(a.grey, w, job.flat);
    const darkFlat = patch(b.grey, w, job.flat);
    trim = new Float32Array(w * h);
    light = new Float32Array(w * h);
    dark = new Float32Array(w * h);
    alpha = new Float32Array(w * h);
    job.seams = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const darkInA = clamp((lightFlat - a.grey[i]) / (lightFlat - darkFlat), 0, 1);
      const lightInB = 1 - clamp((lightFlat - b.grey[i]) / (lightFlat - darkFlat), 0, 1);
      const raw = (darkInA + lightInB) / 2;
      // A strap's edge sits a pixel or two apart in the two photos, so the
      // edge is drawn crisp and its fabric filled from either side.
      const t = clamp((raw - 0.3) / 0.4, 0, 1);
      trim[i] = t * t * (3 - 2 * t);
      if (raw > 0.12 && raw < 0.88) job.seams[i] = 1;
      light[i] = (1 - trim[i]) * a.grey[i] + trim[i] * b.grey[i];
      dark[i] = (1 - trim[i]) * b.grey[i] + trim[i] * a.grey[i];
      alpha[i] = Math.max(clamp((255 - a.grey[i]) / (255 - darkFlat), 0, 1), clamp((255 - b.grey[i]) / (255 - darkFlat), 0, 1));
    }
    // A bright strap also glows a few pixels into the dark body next to it
    // (lens blur and JPEG ringing), which would read as a light line.
    job.seams = dilate(job.seams, w, h, 3);
    job.lightFlat = lightFlat;
    job.darkFlat = darkFlat;
  } else {
    const d = await load(job.dark);
    light = first.grey;
    dark = d.grey;
    job.lightFlat = patch(light, w, job.flat);
    job.darkFlat = patch(dark, w, job.flat);
    alpha = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) alpha[i] = clamp((255 - dark[i]) / (255 - job.darkFlat), 0, 1);
  }

  // The garment. Its soft shadow greys the backdrop around it in both photos
  // (a little more in the dark one), so the dark photo alone would count the
  // shadow as garment and the edge would wander a pixel out into it. A pixel
  // is garment when the two photos differ by most of a fabric's worth, or
  // when the dark photo is darker than any shadow (a two-tone strap's seam,
  // where the two photos' colours cross).
  const span = job.lightFlat - job.darkFlat;
  let mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = (light[i] - dark[i]) / span > 0.45 || alpha[i] > 0.55 ? 1 : 0;
  // Where a cream strap meets a cream body (a pixel apart in the two photos),
  // both photos are light and the mask gets thin holes: close them.
  if (job.swap) mask = erode(dilate(mask, w, h, 2), w, h, 2);
  fillHoles(mask, w, h, 400);
  // The neck label's white print reads as backdrop in the black tee's photo;
  // it's fabric (and the label overlay covers it).
  const label = job.label ? labelBox(first, w) : null;
  if (label) {
    const [x0, y0, x1, y1] = label;
    for (let y = y0 - 3; y <= y1 + 3; y++) for (let x = x0 - 3; x <= x1 + 3; x++) mask[y * w + x] = 1;
  }
  const solid = erode(mask, w, h, 2);
  const reliable = erode(mask, w, h, 4);
  const outline = dilate(mask, w, h, 2);
  // The edge, two pixels either side of the mask's: a pixel part fabric,
  // part backdrop differs between the two photos by its fabric share, since
  // the shadow is about the same in both. The faint difference the shadow
  // leaves is dropped, so an edge ends cleanly instead of in a tinted halo.
  // Next to a two-tone seam the difference says nothing, and the darker of
  // the two photos tells the fabric from the backdrop instead.
  const edgeSpan = span * 0.85;
  for (let i = 0; i < w * h; i++) {
    if (solid[i]) alpha[i] = 1;
    else if (!outline[i]) alpha[i] = 0;
    else {
      const share = clamp(((light[i] - dark[i]) / edgeSpan - 0.15) / 0.85, 0, 1);
      alpha[i] = job.seams?.[i] ? Math.max(share, clamp((alpha[i] - 0.3) / 0.6, 0, 1)) : share;
    }
  }

  // Solve shade and sheen where both photos show fabric.
  const shade = new Float32Array(w * h);
  const sheen = new Float32Array(w * h);
  const known = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (!reliable[i] || job.seams?.[i]) continue;
    // The light photo shows the backdrop here: a strap that hangs a little
    // differently in the two photos. Fill it from its neighbours instead.
    if (light[i] > 249) continue;
    shade[i] = (light[i] - dark[i]) / span;
    sheen[i] = dark[i] - job.darkFlat * shade[i];
    known[i] = 1;
  }

  // The tee's neck label is printed black-on-white in every colour, so it's
  // cut out as its own overlay and the fabric under it filled in.
  if (label) {
    const [x0, y0, x1, y1] = label;
    for (let y = y0 - 3; y <= y1 + 3; y++) for (let x = x0 - 3; x <= x1 + 3; x++) known[y * w + x] = 0;
    const lw = x1 - x0 + 1;
    const lh = y1 - y0 + 1;
    const rgba = Buffer.alloc(lw * lh * 4);
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const s = ((y0 + y) * w + (x0 + x)) * 3;
        const o = (y * lw + x) * 4;
        rgba[o] = first.rgb[s];
        rgba[o + 1] = first.rgb[s + 1];
        rgba[o + 2] = first.rgb[s + 2];
        rgba[o + 3] = 255;
      }
    }
    await sharp(rgba, { raw: { width: lw, height: lh, channels: 4 } }).webp({ quality: 92 }).toFile(path.join(OUT, "label.webp"));
    job.labelBox = [x0, y0, lw, lh];
  }

  fill(shade, known, outline, w, h);
  fill(sheen, known, outline, w, h);

  await writeGrey(`${job.view}-shade.webp`, shade.map((v) => (v / SHADE_MAX) * 255), alpha, w, h);
  await writeGrey(`${job.view}-sheen.webp`, sheen.map((v) => v + SHEEN_OFFSET), null, w, h);
  if (trim) await writeGrey(`${job.view}-trim.webp`, trim.map((v) => v * 255), null, w, h);

  // Where the garment sits in the frame, for placing prints.
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { view: job.view, size: [w, h], bbox: [minX, minY, maxX, maxY], lightFlat: Math.round(job.lightFlat), darkFlat: Math.round(job.darkFlat), labelBox: job.labelBox ?? null };
}

/** The neck label: the dark rectangle at the centre of the collar in the
 *  white tee's photo. */
function labelBox(img, w) {
  let x0 = w;
  let y0 = w;
  let x1 = 0;
  let y1 = 0;
  for (let y = 60; y < 260; y++) {
    for (let x = 420; x < 580; x++) {
      if (img.grey[y * w + x] >= 110) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return [x0, y0, x1, y1];
}

fs.mkdirSync(OUT, { recursive: true });
const report = [];
for (const job of JOBS) report.push(await run(job));
console.log(JSON.stringify(report, null, 1));

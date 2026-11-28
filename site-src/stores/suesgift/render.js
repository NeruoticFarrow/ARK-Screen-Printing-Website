// Draws a garment in any colour, with its prints, into a canvas.
//
// Each garment template (images/garments, made by tools/garment-maps.mjs from
// AS Colour's white and black product photos) holds, per pixel:
//   shade  how lit the fabric is (folds, seams, texture), and the outline
//   sheen  the light a black garment still reflects
// so a garment of any colour is   colour × shade + sheen,   which is how the
// photos themselves come out. Prints are mixed into the colour before the
// shading, so the folds run through the ink as they would on a real shirt.

import teeFrontShade from "./images/garments/tee-front-shade.webp";
import teeFrontSheen from "./images/garments/tee-front-sheen.webp";
import teeBackShade from "./images/garments/tee-back-shade.webp";
import teeBackSheen from "./images/garments/tee-back-sheen.webp";
import hoodFrontShade from "./images/garments/hood-front-shade.webp";
import hoodFrontSheen from "./images/garments/hood-front-sheen.webp";
import hoodBackShade from "./images/garments/hood-back-shade.webp";
import hoodBackSheen from "./images/garments/hood-back-sheen.webp";
import carrieShade from "./images/garments/carrie-shade.webp";
import carrieSheen from "./images/garments/carrie-sheen.webp";
import neckLabel from "./images/garments/label.webp";
import badge from "./images/art/badge.webp";
import badgeWhite from "./images/art/badge-white.webp";
import boaBack from "./images/art/boa-back.webp";
import boaBackWhite from "./images/art/boa-back-white.webp";
import boaFront from "./images/art/boa-front.webp";
import boaFrontWhite from "./images/art/boa-front-white.webp";
import heart from "./images/art/heart.webp";
import heartWhite from "./images/art/heart-white.webp";
import logo from "./images/art/logo.webp";
import logoWhite from "./images/art/logo-white.webp";
import notAlone from "./images/art/not-alone.webp";
import notAloneWhite from "./images/art/not-alone-white.webp";
import teeoffBack from "./images/art/teeoff-back.webp";
import teeoffBackWhite from "./images/art/teeoff-back-white.webp";
import teeoffChest from "./images/art/teeoff-chest.webp";
import teeoffChestWhite from "./images/art/teeoff-chest-white.webp";
import toast from "./images/art/toast.webp";
import toastWhite from "./images/art/toast-white.webp";
import tote from "./images/art/tote.webp";
import toteWhite from "./images/art/tote-white.webp";

/** The templates are 1000px squares; print boxes are in that space. */
const TEMPLATE_SIZE = 1000;
/** tools/garment-maps.mjs stores shade / SHADE_MAX and sheen + SHEEN_OFFSET. */
const SHADE_MAX = 1.25;
const SHEEN_OFFSET = 32;

const TEMPLATES = {
  "tee-front": { shade: teeFrontShade, sheen: teeFrontSheen, label: { src: neckLabel, x: 493, y: 124, w: 21, h: 45 } },
  "tee-back": { shade: teeBackShade, sheen: teeBackSheen },
  "hood-front": { shade: hoodFrontShade, sheen: hoodFrontSheen },
  "hood-back": { shade: hoodBackShade, sheen: hoodBackSheen },
  carrie: { shade: carrieShade, sheen: carrieSheen },
};

export const ART = {
  "badge": badge,
  "badge-white": badgeWhite,
  "boa-back": boaBack,
  "boa-back-white": boaBackWhite,
  "boa-front": boaFront,
  "boa-front-white": boaFrontWhite,
  "heart": heart,
  "heart-white": heartWhite,
  "logo": logo,
  "logo-white": logoWhite,
  "not-alone": notAlone,
  "not-alone-white": notAloneWhite,
  "teeoff-back": teeoffBack,
  "teeoff-back-white": teeoffBackWhite,
  "teeoff-chest": teeoffChest,
  "teeoff-chest-white": teeoffChestWhite,
  "toast": toast,
  "toast-white": toastWhite,
  "tote": tote,
  "tote-white": toteWhite,
};

// A swatch colour is printed ink-flat; dyed fabric never reaches pure black
// or white. This maps a swatch channel to the fabric's (fitted to AS
// Colour's photos of the same colours).
const TONE = new Float32Array(256);
for (let v = 0; v < 256; v++) TONE[v] = v < 40 ? 22 + v * 0.45 : v > 215 ? 215 + (v - 215) * 0.725 : v;

const rgb = (hex) => [1, 3, 5].map((i) => TONE[parseInt(hex.slice(i, i + 2), 16)]);

const images = new Map();
function image(src) {
  if (!images.has(src)) {
    const img = new Image();
    img.src = src;
    images.set(src, img.decode().then(() => img));
  }
  return images.get(src);
}

/** Starts decoding every template and print, so the first garment draws
 *  without waiting on them one by one. */
export function preload() {
  for (const t of Object.values(TEMPLATES)) for (const src of [t.shade, t.sheen, t.trim, t.label?.src]) if (src) image(src);
  for (const src of Object.values(ART)) image(src);
}

function pixels(img, w, h = w, sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  return g.getImageData(0, 0, w, h).data;
}

const maps = new Map();
/** A template's maps at `size`, as numbers ready for the formula. */
async function templateAt(name, size) {
  const key = `${name}@${size}`;
  if (!maps.has(key)) {
    maps.set(
      key,
      (async () => {
        const t = TEMPLATES[name];
        const [shadeImg, sheenImg, trimImg] = await Promise.all([image(t.shade), image(t.sheen), t.trim ? image(t.trim) : null]);
        const shade = pixels(shadeImg, size);
        const sheen = pixels(sheenImg, size);
        const trim = trimImg ? pixels(trimImg, size) : null;
        const n = size * size;
        const S = new Float32Array(n);
        const SP = new Float32Array(n);
        const alpha = new Uint8ClampedArray(n);
        const T = trim ? new Float32Array(n) : null;
        for (let i = 0; i < n; i++) {
          S[i] = (shade[i * 4] / 255) * SHADE_MAX;
          SP[i] = sheen[i * 4] - SHEEN_OFFSET;
          alpha[i] = shade[i * 4 + 3];
          if (T) T[i] = trim[i * 4] / 255;
        }
        return { S, SP, alpha, T, label: t.label ? await image(t.label.src) : null, labelBox: t.label };
      })(),
    );
  }
  return maps.get(key);
}

const prints = new Map();
/** A print's artwork scaled into its box at `size`. */
async function printAt(art, box, size) {
  const key = `${art}@${size}:${box.join(",")}`;
  if (!prints.has(key)) {
    prints.set(
      key,
      (async () => {
        const img = await image(ART[art]);
        const k = size / TEMPLATE_SIZE;
        const [left, top, width] = box;
        const height = (width * img.naturalHeight) / img.naturalWidth;
        const x = Math.round(left * k);
        const y = Math.round(top * k);
        const w = Math.max(1, Math.round(width * k));
        const h = Math.max(1, Math.round(height * k));
        return { x, y, w, h, data: pixels(img, w, h) };
      })(),
    );
  }
  return prints.get(key);
}

/** A little lightness noise for the heathered colours (Athletic Heather,
 *  Granite): mostly along the knit's rows. */
function heatherNoise(x, y) {
  const hash = (a, b) => {
    let h = Math.imul(a, 374761393) + Math.imul(b, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) & 1023) / 1023 - 0.5;
  };
  return 26 * (0.65 * hash(x, y >> 2) + 0.35 * hash(x + 7, y));
}

/** The pixels of one garment look (catalog.mjs garmentLook) at `size`. */
async function paint(look, size) {
  const map = await templateAt(look.template, size);
  const placed = await Promise.all(look.prints.map((p) => printAt(p.art, p.box, size)));
  const out = new ImageData(size, size);
  const d = out.data;
  const [br, bg, bb] = rgb(look.body);
  const trim = look.trim ? rgb(look.trim) : null;
  const { S, SP, alpha, T } = map;

  const fabric = (i, px) => {
    let r = br;
    let g = bg;
    let b = bb;
    if (trim) {
      const t = T[i];
      r += (trim[0] - r) * t;
      g += (trim[1] - g) * t;
      b += (trim[2] - b) * t;
    }
    if (look.heather) {
      const n = heatherNoise(i % size, (i / size) | 0);
      r += n;
      g += n;
      b += n;
    }
    px[0] = r;
    px[1] = g;
    px[2] = b;
  };

  const px = [0, 0, 0];
  const n = size * size;
  for (let i = 0; i < n; i++) {
    const a = alpha[i];
    if (!a) continue;
    fabric(i, px);
    const o = i * 4;
    d[o] = px[0] * S[i] + SP[i];
    d[o + 1] = px[1] * S[i] + SP[i];
    d[o + 2] = px[2] * S[i] + SP[i];
    d[o + 3] = a;
  }

  for (const p of placed) {
    for (let yy = 0; yy < p.h; yy++) {
      const y = p.y + yy;
      if (y < 0 || y >= size) continue;
      for (let xx = 0; xx < p.w; xx++) {
        const x = p.x + xx;
        if (x < 0 || x >= size) continue;
        const i = y * size + x;
        if (!alpha[i]) continue;
        const q = (yy * p.w + xx) * 4;
        const ink = p.data[q + 3] / 255;
        if (!ink) continue;
        fabric(i, px);
        const r = px[0] + (TONE[p.data[q]] - px[0]) * ink;
        const g = px[1] + (TONE[p.data[q + 1]] - px[1]) * ink;
        const b = px[2] + (TONE[p.data[q + 2]] - px[2]) * ink;
        const o = i * 4;
        d[o] = r * S[i] + SP[i];
        d[o + 1] = g * S[i] + SP[i];
        d[o + 2] = b * S[i] + SP[i];
      }
    }
  }
  return { out, map };
}

const lookKey = (look, size) => `${look.template}|${look.body}|${look.trim}|${look.heather}|${look.prints.map((p) => `${p.art}:${p.box}`).join(";")}|${size}`;

/** Recently drawn looks, so flipping a card between front and back, or
 *  between two colours, doesn't paint them again. */
const recent = new Map();
const RECENT_MAX = 12;

/** Draws `look` into `canvas` (a square; its width is the size). Resolves to
 *  false when a newer draw into the same canvas overtook it. */
export async function drawGarment(canvas, look) {
  const size = canvas.width;
  const key = lookKey(look, size);
  canvas.dataset.look = key;
  let done = recent.get(key);
  if (!done) {
    done = paint(look, size);
    recent.set(key, done);
    if (recent.size > RECENT_MAX) recent.delete(recent.keys().next().value);
  } else {
    recent.delete(key);
    recent.set(key, done);
  }
  const { out, map } = await done;
  if (canvas.dataset.look !== key) return false;
  const g = canvas.getContext("2d");
  g.putImageData(out, 0, 0);
  if (map.label) {
    // The neck label is the same in every colour.
    const k = size / TEMPLATE_SIZE;
    const { x, y, w, h } = map.labelBox;
    g.drawImage(map.label, x * k, y * k, w * k, h * k);
  }
  return true;
}

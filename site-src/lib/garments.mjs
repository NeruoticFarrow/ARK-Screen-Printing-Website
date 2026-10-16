// Garment drawings for the print-on-demand categories: one line weight, round
// joins and a tan patch where the print goes, so the set reads as a family
// beside the Phosphor icons. Drawn on a 64 × 64 grid, symmetric about x = 32.
// Decorative (aria-hidden): each sits beside its category's name.

const TEE = "M24 8c2.5 4 13.5 4 16 0l12 5 8 12-9 5-2-3v29H15V27l-2 3-9-5 8-12z";
const LONG = "M24 8c2.5 4 13.5 4 16 0l11 5c4 2 6 6 7 10l3 27-7 1-5-24v29H15V27l-5 24-7-1 3-27c1-4 3-8 7-10z";

const SHAPES = {
  tee: { lines: [TEE], print: [25, 20, 14, 12] },
  longSleeve: { lines: [LONG], print: [25, 20, 14, 12] },
  hoodie: {
    lines: [
      "M22 12l-9 3c-4 2-6 6-7 10L3 50l7 1 4-22v27h36V29l4 22 7-1-3-25c-1-4-3-8-7-10l-9-3",
      "M22 12c0-6 4.5-9.5 10-9.5S42 6 42 12c0 5-4.5 8-10 8s-10-3-10-8z",
      "M29 20v6M35 20v6",
      "M22 41h20l-2.5 8h-15z",
    ],
    print: [26, 29, 12, 8],
  },
  sweatshirt: {
    lines: [LONG, "M26 10.5c3 3 9 3 12 0", "M15 51h34", "M4 45l7 1M53 46l7-1"],
    print: [25, 21, 14, 11],
  },
  polo: {
    lines: [
      "M40 8l12 5 8 12-9 5-2-3v29H15V27l-2 3-9-5 8-12 12-5",
      "M24 8l8 8 8-8",
      "M24 8l-1.5 7.5 6 2.5M40 8l1.5 7.5-6 2.5",
      "M32 16v9",
    ],
    dots: [[32, 19], [32, 23]],
    print: [17, 30, 9, 7],
  },
  tank: {
    lines: ["M22 5c0 8 4 12 10 12s10-4 10-12l6 2c-1 7 1 13 5 17v32H11V24c4-4 6-10 5-17z"],
    print: [25, 26, 14, 12],
  },
  buttonUp: {
    lines: [LONG.replace("c2.5 4 13.5 4 16 0", "l8 6 8-6"), "M24 8l-2 7 6 3M40 8l2 7-6 3", "M32 14v42"],
    dots: [[34.5, 22], [34.5, 30], [34.5, 38], [34.5, 46]],
    print: [18, 24, 9, 7],
  },
  jacket: {
    lines: [LONG.replace("c2.5 4 13.5 4 16 0", "l3 5h10l3-5"), "M32 13v43", "M21 40l5 6M43 40l-5 6"],
    print: [19, 22, 9, 7],
  },
  youth: {
    lines: ["M27 18c1.7 2.6 8.3 2.6 10 0l8 3.4 5.4 8.1-6 3.4-1.4-2V52H21V31l-1.4 2-6-3.4L19 21.4z", "M47 9l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z"],
    print: [27, 28, 10, 9],
  },
  tote: {
    lines: ["M13 24h38l-3 33H16z", "M24 24c0-9 3-14 8-14s8 5 8 14"],
    print: [24, 33, 16, 14],
  },
  apron: {
    lines: [
      "M22 14h20v12l6 4v24c0 2-1.5 3-3 3H19c-1.5 0-3-1-3-3V30l6-4z",
      "M22 14c0-6 4.5-10 10-10s10 4 10 10",
      "M16 31l-9 4M48 31l9 4",
      "M24 42h16v8H24z",
    ],
    print: [26, 17, 12, 7],
  },
  overalls: {
    lines: ["M16 30h32l2 28H38l-6-17-6 17H14z", "M22 30V16h20v14", "M22 16l-4-11M42 16l4-11"],
    dots: [[22.5, 18.5], [41.5, 18.5]],
    print: [26, 19, 12, 8],
  },
};

/** One drawing as inline SVG. */
export function garment(kind, className = "garment") {
  const s = SHAPES[kind];
  if (!s) throw new Error(`unknown garment: ${kind}`);
  const [x, y, w, h] = s.print;
  const print = `<rect class="garment-print" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`;
  const lines = s.lines.map((d) => `<path d="${d}"/>`).join("");
  const dots = (s.dots ?? []).map(([cx, cy]) => `<circle class="garment-dot" cx="${cx}" cy="${cy}" r="1.3"/>`).join("");
  return `<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${print}<g class="garment-line">${lines}</g>${dots}</svg>`;
}

export const GARMENT_KINDS = Object.keys(SHAPES);

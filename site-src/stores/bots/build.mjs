// Builds the Best of the Springs sample store into
// ark-site-review/bos.html: app.jsx with React, the styles,
// fonts, garment templates and artwork bundled into one self-contained page
// that makes no requests at all. site-src/build.mjs runs it.
//
// The output is deterministic, so CI can check the committed page is current.

import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";
import { STORE } from "./catalog.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

export const STORE_HEAD = {
  title: "Best of the Springs Shop · The Gazette",
  description: "Tees and totes for The Gazette's Best of the Springs: the 2027 Crown and 2026 Winner gear, in every AS Colour color, printed in Colorado Springs by ARK Screen Printing.",
  canonical: `https://arkscreenprinting.com${STORE.path}`,
};

const escapeAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const escapeText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export async function buildBotsStore(outFile) {
  const result = await esbuild.build({
    entryPoints: [path.join(HERE, "entry.js")],
    bundle: true,
    write: false,
    outdir: "out",
    format: "esm",
    target: ["es2020"],
    minify: true,
    legalComments: "inline",
    jsx: "automatic",
    loader: { ".jsx": "jsx", ".webp": "dataurl", ".woff2": "dataurl" },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
  });
  const js = result.outputFiles.find((f) => f.path.endsWith(".js"))?.text;
  const css = result.outputFiles.find((f) => f.path.endsWith(".css"))?.text;
  if (!js || !css) throw new Error("bots store: esbuild produced no script or stylesheet");
  // Inline <script>/<style> must not contain their own closing tags.
  if (/<\/script/i.test(js) || /<\/style/i.test(css)) throw new Error("bots store: bundle contains a closing tag");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="description" content="${escapeAttr(STORE_HEAD.description)}" />
    <meta name="theme-color" content="#591045" />
    <title>${escapeText(STORE_HEAD.title)}</title>
    <link rel="canonical" href="${STORE_HEAD.canonical}" />
    <style>${css.trim()}</style>
  </head>
  <body>
    <div id="root"></div>
    <noscript><p style="padding:24px;font-family:Georgia,serif">The Best of the Springs Shop needs JavaScript turned on.</p></noscript>
    <script type="module">${js.trim()}</script>
  </body>
</html>
`;
  fs.writeFileSync(outFile, html);
  return { bytes: Buffer.byteLength(html) };
}

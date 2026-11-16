// Builds the RMPC season store into ark-site-review/rmpc.html: app.jsx with
// React, the styles, fonts and product images bundled into one self-contained
// page (no requests except the checkout call). site-src/build.mjs runs it.
//
// The output is deterministic, so CI can check the committed page is current.

import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

export const STORE_HEAD = {
  title: "RMPC 2027 Season Store",
  description: "Preorder the Rocky Mountain Parkour Championships 2027 season collection: tees and crewnecks printed locally by ARK Screen Printing.",
  canonical: "https://arkscreenprinting.com/rmpc",
};

const escapeAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export async function buildRmpcStore(outFile) {
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
    loader: { ".jsx": "jsx", ".png": "dataurl", ".webp": "dataurl", ".ttf": "dataurl" },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
  });
  const js = result.outputFiles.find((f) => f.path.endsWith(".js"))?.text;
  const css = result.outputFiles.find((f) => f.path.endsWith(".css"))?.text;
  if (!js || !css) throw new Error("rmpc store: esbuild produced no script or stylesheet");
  // Inline <script>/<style> must not contain their own closing tags.
  if (/<\/script/i.test(js) || /<\/style/i.test(css)) throw new Error("rmpc store: bundle contains a closing tag");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="description" content="${escapeAttr(STORE_HEAD.description)}" />
    <meta name="theme-color" content="#101b28" />
    <title>${STORE_HEAD.title}</title>
    <link rel="canonical" href="${STORE_HEAD.canonical}" />
    <style>${css.trim()}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${js.trim()}</script>
  </body>
</html>
`;
  fs.writeFileSync(outFile, html);
  return { bytes: Buffer.byteLength(html) };
}

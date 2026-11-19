// Builds the client store dashboard into ark-site-review/dashboard.html: app.jsx
// with React and the styles in one page, served at /dashboard and
// /dashboard/* (ark-site-review/_redirects). It loads only this site's fonts
// and logo, and talks only to /api/dashboard/… (netlify/functions/dashboard-api.mjs).
// site-src/build.mjs runs it and writes the page's headers.
//
// The script and stylesheet are inline, so the page's Content-Security-Policy
// names their SHA-256 hashes instead of allowing every inline script: nothing
// but this exact bundle can run on a page that shows buyers' names and emails.
// The output is deterministic, so the hashes only change with the code.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

export const DASHBOARD_HEAD = {
  title: "ARK Store Dashboard",
  description: "Sign in to see your ARK store's orders, print counts and profit.",
  canonical: "https://arkscreenprinting.com/dashboard",
};

const sha256 = (text) => `'sha256-${crypto.createHash("sha256").update(text, "utf8").digest("base64")}'`;

/** The page's Content-Security-Policy, given the build's hashes. */
export function dashboardCsp({ scriptHash, styleHash }) {
  return `default-src 'none'; script-src ${scriptHash}; style-src ${styleHash}; img-src 'self'; font-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`;
}

export async function buildDashboard(outFile) {
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
    loader: { ".jsx": "jsx" },
    // The stylesheet's url(/fonts/…) and the logo are the site's own files.
    external: ["/fonts/*", "/assets/*"],
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
  });
  const js = result.outputFiles.find((f) => f.path.endsWith(".js"))?.text.trim();
  const css = result.outputFiles.find((f) => f.path.endsWith(".css"))?.text.trim();
  if (!js || !css) throw new Error("dashboard: esbuild produced no script or stylesheet");
  // Inline <script>/<style> must not contain their own closing tags.
  if (/<\/script/i.test(js) || /<\/style/i.test(css)) throw new Error("dashboard: bundle contains a closing tag");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="referrer" content="no-referrer" />
    <meta name="description" content="${DASHBOARD_HEAD.description}" />
    <meta name="theme-color" content="#f5eedf" />
    <title>${DASHBOARD_HEAD.title}</title>
    <link rel="canonical" href="${DASHBOARD_HEAD.canonical}" />
    <link rel="icon" href="/assets/brand/ark-logo-120.png" type="image/png" />
    <link rel="preload" href="/fonts/gf/inter-400.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/gf/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin />
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${js}</script>
  </body>
</html>
`;
  fs.writeFileSync(outFile, html);
  return { bytes: Buffer.byteLength(html), scriptHash: sha256(js), styleHash: sha256(css) };
}

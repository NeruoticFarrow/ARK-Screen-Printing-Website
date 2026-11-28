// Receives Ryze AI's articles and publishes them on the blog.
//
// Ryze POSTs one article per request as JSON (slug, title, body_html,
// body_markdown, blocks, meta_title, meta_description, excerpt,
// primary_keyword, image {url, alt}, published_at, updated_at, status) with
// "Authorization: Bearer <RYZE_WEBHOOK_TOKEN>". The article is upserted by
// slug: it is committed to GitHub as site-src/content/blog/<slug>.json, with
// its image copied to ark-site-review/images/blog/, in one commit on main.
// That push makes Netlify rebuild, and site-src/build.mjs writes /blog and
// /blog/<slug> from the files. The repository is the blog's database, so every
// article has history and nothing depends on Ryze keeping its copy.
//
// Netlify environment variables (Site configuration → Environment variables):
//   RYZE_WEBHOOK_TOKEN  the bearer token pasted into Ryze (any long random string)
//   GITHUB_TOKEN        fine-grained token, this repository only, Contents: read and write
//   GITHUB_REPO         optional, default NeruoticFarrow/ARK-Screen-Printing-Website
//   GITHUB_BRANCH       optional, default main

import crypto from "node:crypto";

export const config = { path: "/api/ryze-webhook" };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const FIELDS = ["slug", "title", "body_html", "body_markdown", "blocks", "meta_title", "meta_description", "excerpt", "primary_keyword", "image", "published_at", "updated_at", "status"];

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function authorised(req, token) {
  const sent = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const [a, b] = [crypto.createHash("sha256").update(sent).digest(), crypto.createHash("sha256").update(token).digest()];
  return sent.length > 0 && crypto.timingSafeEqual(a, b);
}

export default async (req) => {
  const env = process.env;
  if (req.method !== "POST") return json(405, { error: "POST only" });
  if (!env.RYZE_WEBHOOK_TOKEN || !env.GITHUB_TOKEN) return json(500, { error: "RYZE_WEBHOOK_TOKEN and GITHUB_TOKEN must be set in Netlify" });
  if (!authorised(req, env.RYZE_WEBHOOK_TOKEN)) return json(401, { error: "bad bearer token" });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: "body is not JSON" }); }
  const article = Object.fromEntries(FIELDS.filter((k) => body?.[k] !== undefined).map((k) => [k, body[k]]));
  const slug = String(article.slug ?? "").trim().toLowerCase();
  if (!SLUG.test(slug) || slug.length > 120) return json(400, { error: "slug must be lower-case words joined by hyphens" });
  if (!article.title) return json(400, { error: "title is required" });
  if (!article.body_html && !article.body_markdown) return json(400, { error: "body_html or body_markdown is required" });
  article.slug = slug;

  const gh = github(env.GITHUB_REPO || "NeruoticFarrow/ARK-Screen-Printing-Website", env.GITHUB_BRANCH || "main", env.GITHUB_TOKEN);
  const files = {};

  // The featured image is copied into the site, so the article never shows a
  // broken image if Ryze's link stops working. If the copy fails the article
  // still publishes, linking the image where Ryze hosts it.
  if (article.image?.url) {
    try {
      const image = await fetchImage(article.image.url);
      const file = `ark-site-review/images/blog/${slug}.${image.ext}`;
      files[file] = { base64: image.data.toString("base64"), sha: gitSha(image.data) };
      article.image = { ...article.image, src: `/${file.replace(/^ark-site-review\//, "")}` };
    } catch (err) {
      console.warn(`image not copied (${article.image.url}): ${err.message}`);
    }
  }
  const text = JSON.stringify(article, null, 2) + "\n";
  files[`site-src/content/blog/${slug}.json`] = { text };

  try {
    const result = await gh.commit(files, `Blog: ${String(article.status ?? "published")} "${String(article.title).slice(0, 80)}" (from Ryze)`);
    console.log(`${slug}: ${result}`);
  } catch (err) {
    console.error(`${slug}: ${err.message}`);
    return json(502, { error: "could not save the article", detail: err.message });
  }
  return json(200, { ok: true, slug, url: `https://arkscreenprinting.com/blog/${slug}` });
};

async function fetchImage(url) {
  if (!/^https:\/\//i.test(url)) throw new Error("not an https URL");
  const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = IMAGE_TYPES[type];
  if (!ext) throw new Error(`unsupported type ${type || "(none)"}`);
  const data = Buffer.from(await res.arrayBuffer());
  if (data.length > MAX_IMAGE_BYTES) throw new Error(`${data.length} bytes is over the limit`);
  return { data, ext };
}

/** Git's blob id, so an unchanged image isn't uploaded again. */
const gitSha = (buf) => crypto.createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");

/** Just enough of GitHub's Git Data API to put several files in one commit. */
function github(repo, branch, token) {
  const api = async (method, path, body) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "ark-ryze-webhook" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw Object.assign(new Error(`GitHub ${method} ${path}: ${res.status} ${data?.message ?? ""}`.trim()), { status: res.status });
    return data;
  };

  return {
    async commit(files, message) {
      // Ryze can send several articles at once; if another commit lands
      // between reading main and moving it, start again from the new tip.
      for (let attempt = 1; ; attempt++) {
        const ref = await api("GET", `/git/ref/heads/${branch}`);
        const parent = await api("GET", `/git/commits/${ref.object.sha}`);
        const existing = await api("GET", `/git/trees/${parent.tree.sha}?recursive=1`).catch(() => ({ tree: [] }));
        const current = Object.fromEntries((existing.tree ?? []).map((t) => [t.path, t.sha]));
        const tree = [];
        for (const [path, f] of Object.entries(files)) {
          const sha = f.sha ?? gitSha(Buffer.from(f.text, "utf8"));
          if (current[path] === sha) continue;
          const blob = f.text !== undefined ? await api("POST", "/git/blobs", { content: f.text, encoding: "utf-8" }) : await api("POST", "/git/blobs", { content: f.base64, encoding: "base64" });
          tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
        }
        // Ryze resending an article it already sent: nothing to commit, no rebuild.
        if (!tree.length) return "unchanged";
        const newTree = await api("POST", "/git/trees", { base_tree: parent.tree.sha, tree });
        const commit = await api("POST", "/git/commits", { message, tree: newTree.sha, parents: [ref.object.sha] });
        try {
          await api("PATCH", `/git/refs/heads/${branch}`, { sha: commit.sha, force: false });
          return `committed ${commit.sha.slice(0, 7)} (${tree.map((t) => t.path).join(", ")})`;
        } catch (err) {
          if (err.status !== 422 || attempt >= 4) throw err;
          await new Promise((r) => setTimeout(r, 400 * attempt + Math.random() * 400));
        }
      }
    },
  };
}

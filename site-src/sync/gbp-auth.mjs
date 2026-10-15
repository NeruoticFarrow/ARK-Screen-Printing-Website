// One-time setup, run by the owner on their own computer (never in CI): signs
// in to Google with the shop's account, prints the refresh token, and lists the
// account and location IDs the sync needs. Paste the printed values into
// Netlify's environment variables — never into a file in this repo.
//
//   GBP_CLIENT_ID=… GBP_CLIENT_SECRET=… npm run gbp:auth
//
// (Windows PowerShell:  $env:GBP_CLIENT_ID="…"; $env:GBP_CLIENT_SECRET="…"; npm run gbp:auth)

import http from "node:http";
import { listLocations, SCOPE } from "./google.mjs";

const clientId = process.env.GBP_CLIENT_ID;
const clientSecret = process.env.GBP_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("Set GBP_CLIENT_ID and GBP_CLIENT_SECRET first (from your Google Cloud OAuth client, type Desktop app).");
  process.exit(1);
}

const PORT = 53682;
const redirectUri = `http://127.0.0.1:${PORT}/callback`;
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: "code",
  scope: SCOPE,
  access_type: "offline",
  prompt: "consent",
})}`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== "/callback") { res.writeHead(404).end(); return; }
  const code = url.searchParams.get("code");
  if (!code) { res.writeHead(400).end(`Sign-in was cancelled: ${url.searchParams.get("error") ?? "no code"}`); return; }
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(JSON.stringify(tokens));
    res.writeHead(200, { "content-type": "text/plain" }).end("Signed in. You can close this tab and return to the terminal.");
    console.log("\nGBP_REFRESH_TOKEN (keep it secret — paste it into Netlify only):\n");
    console.log(tokens.refresh_token ?? "(none returned — remove the app's access at myaccount.google.com/permissions and run this again)");
    try {
      const locations = await listLocations(tokens.access_token);
      console.log("\nLocations this account manages (use the matching pair):");
      for (const l of locations) console.log(`  GBP_ACCOUNT_ID=${l.account}  GBP_LOCATION_ID=${l.location}  — ${l.title}${l.address ? ` · ${l.address}` : ""}`);
      if (!locations.length) console.log("  (none found — is this the Google account that owns the Business Profile?)");
    } catch (e) {
      console.log(`\nCouldn't list locations yet (${e.message.slice(0, 160)}). If the quota is 0, Google hasn't approved API access yet.`);
    }
  } catch (e) {
    console.error(`Token exchange failed: ${e.message.slice(0, 300)}`);
    res.writeHead(500).end("Token exchange failed — see the terminal.");
  } finally {
    server.close();
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Open this link, sign in with the Google account that owns the ARK Business Profile, and allow access:\n");
  console.log(authUrl);
});

// A small client for the Google Business Profile APIs (the shop's own profile):
// an access token from the owner's refresh token, then reviews, owner-uploaded
// media and the account/location list. Credentials come only from environment
// variables (Netlify → Site configuration → Environment variables):
//
//   GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN, GBP_ACCOUNT_ID, GBP_LOCATION_ID
//
// API access must be approved by Google first (quota is 0 until then):
// https://developers.google.com/my-business/content/prereqs

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const V4 = "https://mybusiness.googleapis.com/v4";
export const SCOPE = "https://www.googleapis.com/auth/business.manage";

export function credentials(env = process.env) {
  const c = {
    clientId: env.GBP_CLIENT_ID,
    clientSecret: env.GBP_CLIENT_SECRET,
    refreshToken: env.GBP_REFRESH_TOKEN,
    accountId: env.GBP_ACCOUNT_ID,
    locationId: env.GBP_LOCATION_ID,
  };
  const ENV = { clientId: "GBP_CLIENT_ID", clientSecret: "GBP_CLIENT_SECRET", refreshToken: "GBP_REFRESH_TOKEN", accountId: "GBP_ACCOUNT_ID", locationId: "GBP_LOCATION_ID" };
  const missing = Object.entries(c).filter(([, v]) => !v).map(([k]) => ENV[k]);
  return { ...c, missing };
}

export async function accessToken({ clientId, clientSecret, refreshToken }) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  if (!res.ok) throw new Error(`token refresh failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).access_token;
}

async function get(url, token) {
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`GET ${url.replace(/\?.*/, "")}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const parent = (c) => `accounts/${c.accountId}/locations/${c.locationId}`;

/** Every review, newest first, plus the profile's average and total. */
export async function listReviews(c, token) {
  const reviews = [];
  let pageToken = "";
  let averageRating = null;
  let totalReviewCount = null;
  do {
    const q = new URLSearchParams({ pageSize: "50", orderBy: "updateTime desc", ...(pageToken ? { pageToken } : {}) });
    const page = await get(`${V4}/${parent(c)}/reviews?${q}`, token);
    averageRating ??= page.averageRating ?? null;
    totalReviewCount ??= page.totalReviewCount ?? null;
    reviews.push(...(page.reviews ?? []));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken && reviews.length < 500);
  return { averageRating, totalReviewCount, reviews };
}

/** The location's media (this endpoint lists the business's own uploads;
 *  customer photos are a separate endpoint we deliberately don't call). */
export async function listOwnerMedia(c, token) {
  const items = [];
  let pageToken = "";
  do {
    const q = new URLSearchParams({ pageSize: "100", ...(pageToken ? { pageToken } : {}) });
    const page = await get(`${V4}/${parent(c)}/media?${q}`, token);
    items.push(...(page.mediaItems ?? []));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken && items.length < 500);
  return items;
}

/** For setup: the accounts and locations this sign-in can manage. */
export async function listLocations(token) {
  const out = [];
  const accounts = await get("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", token);
  for (const a of accounts.accounts ?? []) {
    const locs = await get(`https://mybusinessbusinessinformation.googleapis.com/v1/${a.name}/locations?readMask=name,title,storefrontAddress&pageSize=100`, token);
    for (const l of locs.locations ?? []) out.push({ account: a.name.split("/")[1], accountName: a.accountName, location: l.name.split("/")[1], title: l.title, address: l.storefrontAddress?.addressLines?.join(", ") ?? "" });
  }
  return out;
}

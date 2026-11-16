// A small Stripe REST client for the site's Netlify Functions: form-encodes
// nested parameters the way Stripe expects (a[b][0][c]=…) and pins the API
// version the ARK designer's SDK uses (stripe@22, ark-designer), so both read
// the same object shapes from the same account. No SDK, so no dependency.

export const STRIPE_API = "https://api.stripe.com";
export const STRIPE_VERSION = "2026-06-24.dahlia";

export function encodeForm(params, prefix = "", out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === "object") encodeForm(item, `${name}[${i}]`, out);
        else out.append(`${name}[${i}]`, String(item));
      });
    } else if (typeof value === "object") {
      encodeForm(value, name, out);
    } else {
      out.append(name, String(value));
    }
  }
  return out;
}

export class StripeError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = "StripeError";
    this.status = status;
    this.detail = detail;
  }
}

/** One Stripe API call. Throws StripeError with Stripe's own message. */
export async function stripeRequest(secretKey, method, path, params, { fetchImpl = fetch } = {}) {
  const url = new URL(path, STRIPE_API);
  const headers = { Authorization: `Bearer ${secretKey}`, "Stripe-Version": STRIPE_VERSION };
  const init = { method, headers };
  if (params) {
    const form = encodeForm(params).toString();
    if (method === "GET") url.search = form;
    else {
      init.body = form;
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
  }
  const res = await fetchImpl(url, init);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new StripeError(data?.error?.message ?? `Stripe answered ${res.status}`, res.status, data?.error ?? null);
  return data;
}

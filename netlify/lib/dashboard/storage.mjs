// What the client dashboard keeps that isn't in Stripe: who may sign in to
// each store, ARK's cost sheets, payments made to clients, and the sign-in
// codes and sessions in flight. None of it may live in this repository, which
// is public.
//
// On Netlify it's Netlify Blobs (built in, nothing to set up). Production and
// every other deploy context (deploy previews, branch deploys, local dev)
// get separate stores, so trying a preview never touches the live lists.
// Tests use memoryStorage().
//
// Keys:
//   access/<store>      { emails, updatedAt, updatedBy }
//   costs/<store>       { groups, updatedAt, updatedBy }
//   payments/<store>    { list: [{ id, date, amountCents, method, note, recordedAt, recordedBy }] }
//   code/<sha256 email> a sign-in code waiting to be typed
//   link/<sha256 token> a sign-in link waiting to be opened
//   session/<sha256 token>

/** The Blobs store's name for a Netlify deploy context. */
export function storeName(deployContext) {
  const context = String(deployContext || "dev").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return context === "production" ? "client-dashboard" : `client-dashboard-${context}`;
}

export async function blobStorage(deployContext) {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: storeName(deployContext), consistency: "strong" });
  return {
    get: (key) => store.get(key, { type: "json" }),
    set: (key, value) => store.setJSON(key, value).then(() => undefined),
    delete: (key) => store.delete(key),
  };
}

export function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  return {
    map,
    get: async (key) => (map.has(key) ? JSON.parse(map.get(key)) : null),
    set: async (key, value) => { map.set(key, JSON.stringify(value)); },
    delete: async (key) => { map.delete(key); },
  };
}

// Who may see what. ARK's people are the addresses in DASHBOARD_ADMIN_EMAILS
// (a Netlify setting) and see every store. A client sees the stores whose
// list (saved by ARK on the dashboard's ARK page) has their address.

import { normaliseEmail } from "./auth.mjs";
import { STORES } from "./stores.mjs";

export const MAX_CLIENTS = 20;

/** Addresses from a comma- or newline-separated setting, normalised, unique. */
export function emailList(value) {
  const list = Array.isArray(value) ? value : String(value ?? "").split(/[\s,;]+/);
  return [...new Set(list.map(normaliseEmail).filter(Boolean))];
}

export const adminEmails = (env) => emailList(env.DASHBOARD_ADMIN_EMAILS);

export const isAdmin = (env, email) => Boolean(email) && adminEmails(env).includes(email);

export async function clientList(storage, storeId) {
  return (await storage.get(`access/${storeId}`)) ?? null;
}

export async function saveClientList(storage, storeId, emails, { by, now = Date.now() }) {
  const record = { emails: emailList(emails).slice(0, MAX_CLIENTS), updatedAt: now, updatedBy: by };
  await storage.set(`access/${storeId}`, record);
  return record;
}

/** The stores `email` may open, and whether it's ARK's. */
export async function accessFor(email, { env, storage }) {
  if (!email) return { admin: false, stores: [] };
  if (isAdmin(env, email)) return { admin: true, stores: STORES };
  const stores = [];
  for (const store of STORES) {
    const list = await clientList(storage, store.id);
    if (list?.emails?.includes(email)) stores.push(store);
  }
  return { admin: false, stores };
}

export async function canSignIn(email, ctx) {
  return (await accessFor(email, ctx)).stores.length > 0;
}

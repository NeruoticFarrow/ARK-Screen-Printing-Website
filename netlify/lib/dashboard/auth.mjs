// Signing in to the client dashboard, the way the Creator Studio signs
// creators in: the person types their email, gets a 6-digit code and a
// one-tap link, and either one starts a session. No passwords.
//
// - A code works for 15 minutes and for 5 tries, and only the newest one counts.
// - One address gets at most 5 codes an hour, and one every 30 seconds.
// - Only an address that can see a store gets an email, but every address
//   gets the same answer, so the form doesn't tell anyone who is a client.
// - A session lasts 30 days, lives in storage (so signing out ends it
//   everywhere), and carries only the email. What the email may see is looked
//   up again on every request, so taking someone off a store takes effect at once.
//
// Codes, links and session tokens are stored as SHA-256 hashes, never as typed.

import crypto from "node:crypto";

export const CODE_MINUTES = 15;
export const MAX_TRIES = 5;
export const CODES_PER_HOUR = 5;
export const RESEND_SECONDS = 30;
export const SESSION_DAYS = 30;
export const COOKIE = "__Host-ark_dashboard";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const EMAIL = /^[^\s@,<>"']+@[^\s@,<>"']+\.[^\s@,<>"']+$/;

const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

function sameHash(a, b) {
  const x = Buffer.from(String(a), "hex");
  const y = Buffer.from(String(b), "hex");
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

/** A typed address as the dashboard keeps it, or null when it isn't one. */
export function normaliseEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

const codeKey = (email) => `code/${sha256(email)}`;
const linkKey = (token) => `link/${sha256(token)}`;
const sessionKey = (token) => `session/${sha256(token)}`;
const codeHash = (email, code) => sha256(`${email}:${code}`);

/**
 * Sends a code and link to `email` when `canSignIn(email)` says it may see a
 * store. Answers `{ ok: true }` either way; `{ ok: false, status, error }`
 * only for a bad address or too many codes.
 */
export async function requestCode({ email: typed, storage, canSignIn, send, origin, now = Date.now(), random = crypto }) {
  const email = normaliseEmail(typed);
  if (!email) return { ok: false, status: 400, error: "Enter your email address." };
  const prior = await storage.get(codeKey(email));
  const sends = (prior?.sends ?? []).filter((at) => now - at < HOUR);
  if (sends.length && now - sends[sends.length - 1] < RESEND_SECONDS * 1000) {
    return { ok: false, status: 429, error: "A code is already on its way. Give it a minute, then try again." };
  }
  if (sends.length >= CODES_PER_HOUR) return { ok: false, status: 429, error: "That's a lot of codes for one address. Try again in an hour." };
  if (!(await canSignIn(email))) {
    // Counted like a real send, so the limits answer the same for everyone.
    await storage.set(codeKey(email), { sends: [...sends, now], expiresAt: 0, tries: MAX_TRIES });
    return { ok: true };
  }

  const code = String(random.randomInt(0, 1_000_000)).padStart(6, "0");
  const token = random.randomBytes(32).toString("base64url");
  const expiresAt = now + CODE_MINUTES * MINUTE;
  if (prior?.link) await storage.delete(`link/${prior.link}`);
  await storage.set(codeKey(email), { code: codeHash(email, code), expiresAt, tries: 0, sends: [...sends, now], link: sha256(token) });
  await storage.set(linkKey(token), { email, expiresAt });
  await send({ email, code, link: `${origin}/dashboard?signin=${encodeURIComponent(token)}` });
  return { ok: true };
}

/** The typed code for `email`: `{ ok: true, email }` once, then it's spent. */
export async function verifyCode({ email: typed, code: typedCode, storage, now = Date.now() }) {
  const email = normaliseEmail(typed);
  const code = String(typedCode ?? "").replace(/\s+/g, "");
  if (!email || !/^\d{6}$/.test(code)) return { ok: false, status: 400, error: "Enter the 6-digit code from the email." };
  const record = await storage.get(codeKey(email));
  if (!record || now >= record.expiresAt) return { ok: false, status: 401, error: "That code has expired. Ask for a new one." };
  if (record.tries >= MAX_TRIES) return { ok: false, status: 401, error: "Too many wrong codes. Ask for a new one." };
  if (!sameHash(record.code, codeHash(email, code))) {
    await storage.set(codeKey(email), { ...record, tries: record.tries + 1 });
    return { ok: false, status: 401, error: "That code isn't right. Check the newest email and try again." };
  }
  await spend(storage, email, record);
  return { ok: true, email };
}

/** The token from an emailed link: `{ ok: true, email }` once. */
export async function verifyLink({ token, storage, now = Date.now() }) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { ok: false, status: 400, error: "That sign-in link isn't complete. Ask for a new one." };
  const link = await storage.get(linkKey(token));
  if (!link || now >= link.expiresAt) return { ok: false, status: 401, error: "That sign-in link has expired. Ask for a new one." };
  await spend(storage, link.email, await storage.get(codeKey(link.email)));
  await storage.delete(linkKey(token));
  return { ok: true, email: link.email };
}

/** A used code takes its link with it, and the reverse, but the count of
 *  codes sent this hour stays. */
async function spend(storage, email, record) {
  if (record?.link) await storage.delete(`link/${record.link}`);
  if (record) await storage.set(codeKey(email), { sends: record.sends ?? [], expiresAt: 0, tries: MAX_TRIES });
}

/** Starts a session and answers the token for the cookie. */
export async function startSession({ email, storage, now = Date.now(), random = crypto }) {
  const token = random.randomBytes(32).toString("base64url");
  await storage.set(sessionKey(token), { email, createdAt: now, expiresAt: now + SESSION_DAYS * DAY });
  return token;
}

/** The signed-in email for a request's cookie, or null. */
export async function sessionEmail({ req, storage, now = Date.now() }) {
  const token = cookieFrom(req);
  if (!token || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const session = await storage.get(sessionKey(token));
  if (!session) return null;
  if (now >= session.expiresAt) {
    await storage.delete(sessionKey(token));
    return null;
  }
  return session.email;
}

export async function endSession({ req, storage }) {
  const token = cookieFrom(req);
  if (token && /^[A-Za-z0-9_-]{20,100}$/.test(token)) await storage.delete(sessionKey(token));
}

export function cookieFrom(req, name = COOKIE) {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const at = part.indexOf("=");
    if (at > 0 && part.slice(0, at).trim() === name) return part.slice(at + 1).trim();
  }
  return null;
}

export const sessionCookie = (token) => `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_DAYS * 86_400}; HttpOnly; Secure; SameSite=Lax`;
export const clearedCookie = () => `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

/** The sign-in email: the code in the subject, so a phone shows it at a glance. */
export function signInEmail({ code, link, contact }) {
  const subject = `${code} is your ARK store dashboard code`;
  const text = [
    `Your code for the ARK Screen Printing store dashboard is ${code}.`,
    "",
    `Or open this link to sign in: ${link}`,
    "",
    `The code and link work for ${CODE_MINUTES} minutes. If you didn't ask to sign in, you can ignore this email.`,
    "",
    `Questions? Reply to this email or call ${contact.phoneDisplay}.`,
  ].join("\n");
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const html = `<div style="font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#10202f;max-width:520px">
<p style="margin:0 0 12px">Your code for the ARK Screen Printing store dashboard:</p>
<p style="margin:0 0 20px;font-size:30px;font-weight:700;letter-spacing:6px">${esc(code)}</p>
<p style="margin:0 0 20px"><a href="${esc(link)}" style="display:inline-block;background:#0c3459;color:#f5eedf;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">Sign in to the dashboard</a></p>
<p style="margin:0 0 8px;color:#4a5560">The code and link work for ${CODE_MINUTES} minutes. If you didn't ask to sign in, you can ignore this email.</p>
<p style="margin:0;color:#4a5560">Questions? Reply to this email or call ${esc(contact.phoneDisplay)}.</p>
</div>`;
  return { subject, text, html };
}

// One email through Resend, from the sender the ARK designer and the order
// emails already use (verified for arkscreenprinting.com). The client
// dashboard sends its sign-in codes with it.

export const SENDER = "ARK Screen Printing <orders@arkscreenprinting.com>";

export async function sendEmail({ apiKey, to, subject, html, text, replyTo, idempotencyKey, fetchImpl = fetch }) {
  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({ from: SENDER, to: Array.isArray(to) ? to : [to], ...(replyTo ? { reply_to: replyTo } : {}), subject, html, text }),
  });
  if (res.ok) return;
  const data = await res.json().catch(() => null);
  throw new Error(`Resend answered ${res.status}: ${data?.message ?? "no message"}`);
}

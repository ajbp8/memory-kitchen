// Sends the app owner a plain-text email when something worth tracking happens
// (new signup, new family). Uses Resend's REST API so there is no SDK to add.
// Configure in Vercel: RESEND_API_KEY and NOTIFY_EMAIL (where the alerts go).
// It never throws: a failed notification must not break signup.
export async function notifyOwner(subject: string, lines: string[]) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!key || !to) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM ?? "Memory Kitchen <onboarding@resend.dev>",
        to: [to],
        subject: `[Memory Kitchen] ${subject}`,
        text: lines.join("\n"),
      }),
    });
  } catch {
    // Swallow: notifications are best-effort.
  }
}

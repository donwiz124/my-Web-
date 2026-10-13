/** Transactional email through Resend. */
export async function sendMail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') console.error('[mail] RESEND_API_KEY is not set; email NOT sent to', to);
    else console.log(`[mail:dev] to=${to} subject="${subject}"\n${html}`);
    return false;
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || 'DONWIZ HANDSOME <onboarding@resend.dev>', to: [to], subject, html }),
  });
  if (!r.ok) throw new Error(`Resend error ${r.status}: ${await r.text().catch(() => '')}`);
  return true;
}

/**
 * Email delivery via Resend
 *
 * The API key lives only in process.env.RESEND_API_KEY — never send it to
 * the client, never include it in API responses, and never log its value.
 */
const { Resend } = require('resend');

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const error = new Error('Email service is not configured. Set RESEND_API_KEY.');
    error.statusCode = 503;
    throw error;
  }
  return new Resend(apiKey);
}

function getFromAddress() {
  return process.env.EMAIL_FROM || 'QuiZapp <onboarding@resend.dev>';
}

/**
 * Send a password-reset email containing a one-time link.
 * @param {{ to: string, name: string, resetUrl: string, expiresMinutes: number }} opts
 */
async function sendPasswordResetEmail({ to, name, resetUrl, expiresMinutes }) {
  const resend = getClient();

  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to: [to],
    subject: 'Reset your QuiZapp password',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1a0b2e;max-width:520px">
        <h2 style="margin-bottom:8px">Password reset</h2>
        <p>Hi ${escapeHtml(name || 'there')},</p>
        <p>We received a request to reset your QuiZapp password. Click the button below to choose a new one. This link expires in <strong>${expiresMinutes} minutes</strong>.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="background:#6366f1;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">
            Reset password
          </a>
        </p>
        <p style="font-size:13px;color:#555">If the button does not work, paste this URL into your browser:</p>
        <p style="font-size:13px;word-break:break-all">${escapeHtml(resetUrl)}</p>
        <p style="font-size:13px;color:#555">If you did not request this, you can ignore this email — your password will stay the same.</p>
      </div>
    `,
    text: `Hi ${name || 'there'},\n\nReset your QuiZapp password (expires in ${expiresMinutes} minutes):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
  });

  if (error) {
    // Do not log API keys or the reset URL/token
    console.error('Resend email failed:', error.name || 'Error', error.message || 'unknown');
    const err = new Error('Unable to send reset email. Please try again later.');
    err.statusCode = 502;
    throw err;
  }

  return { id: data?.id };
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { sendPasswordResetEmail };

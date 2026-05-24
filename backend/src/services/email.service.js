const { Resend } = require('resend');
const env = require('../config/env');
const logger = require('../utils/logger');

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendInvite({ to, inviterName, contractTitle, token }) {
  const inviteUrl = `${env.FRONTEND_URL}/invite/${token}`;
  const safeName  = escapeHtml(inviterName);
  const safeTitle = escapeHtml(contractTitle);
  const subject   = `${inviterName} הזמין אותך לחוזה: "${contractTitle}"`;

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>הוזמנת לחוזה</h2>
      <p>שלום,</p>
      <p><strong>${safeName}</strong> שיתף אותך בחוזה <strong>"${safeTitle}"</strong> לעיון וחתימה.</p>
      <p>
        <a href="${inviteUrl}"
           style="display:inline-block; padding:12px 24px; background:#2563eb; color:#fff; text-decoration:none; border-radius:6px;">
          צפה בחוזה &larr;
        </a>
      </p>
      <p style="color:#6b7280; font-size:13px;">הקישור תקף ל-7 ימים.</p>
    </div>
  `;

  if (!resend) {
    logger.warn('Email not sent (no RESEND_API_KEY)', { to, subject, inviteUrl });
    return;
  }

  try {
    await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
    logger.info('Invite email sent', { to });
  } catch (err) {
    logger.error('Failed to send invite email', { to, err: err.message });
  }
}

module.exports = { sendInvite };

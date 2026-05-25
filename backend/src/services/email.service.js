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

async function sendChangeProposed({ to, contractTitle, contractId, changeType }) {
  const safeTitle = escapeHtml(contractTitle);
  const typeLabel = changeType === 'ADD' ? 'הוסף סעיף' : changeType === 'EDIT' ? 'עריכת סעיף' : 'מחיקת סעיף';
  const contractUrl = `${env.FRONTEND_URL}/contracts/${contractId}`;
  const subject = `שינוי חדש ממתין לאישורך בחוזה "${contractTitle}"`;

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>שינוי ממתין לאישורך</h2>
      <p>הוצעה פעולת <strong>${typeLabel}</strong> בחוזה <strong>"${safeTitle}"</strong>.</p>
      <p>
        <a href="${contractUrl}"
           style="display:inline-block; padding:12px 24px; background:#2563eb; color:#fff; text-decoration:none; border-radius:6px;">
          עבור לחוזה &larr;
        </a>
      </p>
    </div>
  `;

  await _send(to, subject, html);
}

async function sendChangeApproved({ to, contractTitle, contractId }) {
  const safeTitle = escapeHtml(contractTitle);
  const contractUrl = `${env.FRONTEND_URL}/contracts/${contractId}`;
  const subject = `השינוי שלך אושר בחוזה "${contractTitle}"`;

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>✓ השינוי שלך אושר</h2>
      <p>הצד השני אישר את השינוי שהצעת בחוזה <strong>"${safeTitle}"</strong>.</p>
      <p>
        <a href="${contractUrl}"
           style="display:inline-block; padding:12px 24px; background:#16a34a; color:#fff; text-decoration:none; border-radius:6px;">
          עבור לחוזה &larr;
        </a>
      </p>
    </div>
  `;

  await _send(to, subject, html);
}

async function sendChangeRejected({ to, contractTitle, contractId, reason }) {
  const safeTitle  = escapeHtml(contractTitle);
  const safeReason = escapeHtml(reason || '');
  const contractUrl = `${env.FRONTEND_URL}/contracts/${contractId}`;
  const subject = `השינוי שלך נדחה בחוזה "${contractTitle}"`;

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>✗ השינוי שלך נדחה</h2>
      <p>הצד השני דחה את השינוי שהצעת בחוזה <strong>"${safeTitle}"</strong>.</p>
      ${safeReason ? `<p>סיבה: <em>${safeReason}</em></p>` : ''}
      <p>
        <a href="${contractUrl}"
           style="display:inline-block; padding:12px 24px; background:#dc2626; color:#fff; text-decoration:none; border-radius:6px;">
          עבור לחוזה &larr;
        </a>
      </p>
    </div>
  `;

  await _send(to, subject, html);
}

async function sendFinalApprovalReady({ to, contractTitle, contractId }) {
  const safeTitle = escapeHtml(contractTitle);
  const contractUrl = `${env.FRONTEND_URL}/contracts/${contractId}`;
  const subject = `החוזה "${contractTitle}" מוכן לאישור סופי`;

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>✅ החוזה מוכן לאישור סופי</h2>
      <p>כל השינויים אושרו בחוזה <strong>"${safeTitle}"</strong>. ניתן לתת אישור סופי.</p>
      <p>
        <a href="${contractUrl}"
           style="display:inline-block; padding:12px 24px; background:#2563eb; color:#fff; text-decoration:none; border-radius:6px;">
          אשר את החוזה &larr;
        </a>
      </p>
    </div>
  `;

  await _send(to, subject, html);
}

async function _send(to, subject, html) {
  if (!resend) {
    logger.warn('Email not sent (no RESEND_API_KEY)', { to, subject });
    return;
  }
  try {
    await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
    logger.info('Email sent', { to, subject });
  } catch (err) {
    logger.error('Failed to send email', { to, err: err.message });
  }
}

module.exports = { sendInvite, sendChangeProposed, sendChangeApproved, sendChangeRejected, sendFinalApprovalReady };

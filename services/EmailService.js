import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

const FROM = process.env.SMTP_FROM || 'Staark <noreply@staark-app.cloud>';
const BASE_URL = process.env.APP_BASE_URL || 'https://staark-app.cloud';

// ─── Shared layout ─────────────────────────────────────────────────────────

function emailLayout({ title, preheader = '', content }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#070810;font-family:Arial,Helvetica,sans-serif;color:#e8e8f0;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${preheader}
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="background-color:#070810;margin:0;padding:0;width:100%;">
        <tr>
          <td align="center" style="padding:32px 16px;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
              style="max-width:640px;width:100%;">
              <tr>
                <td style="padding-bottom:18px;">
                  <div style="font-size:20px;font-weight:700;letter-spacing:1px;color:#ffffff;">
                    STAARK<span style="color:#8b85ff;">.</span>
                  </div>
                </td>
              </tr>
            </table>

            ${content}

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
              style="max-width:640px;width:100%;">
              <tr>
                <td style="padding:18px 10px 0 10px;text-align:center;font-size:12px;line-height:1.6;color:#6f748f;">
                  Staark API Platform<br />
                  This is an automated email.
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ─── Templates ─────────────────────────────────────────────────────────────

function verifyEmailTemplate(displayName, token) {
  const url = `${BASE_URL}/verify-email?token=${token}`;

  return {
    subject: 'Verify your Staark email',
    html: emailLayout({
      title: 'Verify your Staark email',
      preheader: 'Confirm your email address to activate your account.',
      content: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:640px;width:100%;background:#111322;border:1px solid #23263a;border-radius:18px;">
          <tr>
            <td style="padding:36px 32px 28px 32px;text-align:center;">

              <h1 style="margin:0 0 10px 0;font-size:34px;line-height:1.15;color:#ffffff;font-weight:800;">
                Verify your email
              </h1>

              <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#c8cbe0;">
                Hi ${displayName || 'there'},
              </p>

              <p style="margin:0 0 28px 0;font-size:14px;line-height:1.6;color:#9aa0ba;">
                Please confirm your email address to activate your Staark account.
              </p>

              <a href="${url}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#6c63ff;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                Verify Email
              </a>

              <p style="margin:20px 0 0 0;font-size:12px;line-height:1.6;color:#7f86a3;">
                This link expires in 24 hours. If you didn't create a Staark account, you can ignore this email.
              </p>

              <p style="margin:10px 0 0 0;font-size:12px;line-height:1.8;color:#8b85ff;word-break:break-all;">
                ${url}
              </p>

            </td>
          </tr>
        </table>
      `,
    }),
  };
}

function resetPasswordTemplate(displayName, token) {
  const url = `${BASE_URL}/reset-password?token=${token}`;

  return {
    subject: 'Reset your Staark password',
    html: emailLayout({
      title: 'Reset your Staark password',
      preheader: 'Use this secure link to reset your password.',
      content: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:640px;width:100%;background:#111322;border:1px solid #23263a;border-radius:18px;">
          <tr>
            <td style="padding:36px 32px 28px 32px;text-align:center;">

              <h1 style="margin:0 0 10px 0;font-size:34px;line-height:1.15;color:#ffffff;font-weight:800;">
                Reset your password
              </h1>

              <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#c8cbe0;">
                Hi ${displayName || 'there'},
              </p>

              <p style="margin:0 0 28px 0;font-size:14px;line-height:1.6;color:#9aa0ba;">
                We received a request to reset your password.
              </p>

              <a href="${url}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#6c63ff;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                Reset Password
              </a>

              <p style="margin:20px 0 0 0;font-size:12px;line-height:1.6;color:#7f86a3;">
                This link expires in 24 hours. If you didn't request a reset, you can ignore this email.
              </p>

              <p style="margin:10px 0 0 0;font-size:12px;line-height:1.8;color:#8b85ff;word-break:break-all;">
                ${url}
              </p>

            </td>
          </tr>
        </table>
      `,
    }),
  };
}

function apiKeyCreatedTemplate(plan = 'free') {
  const formattedPlan = plan === 'pro' ? 'Professional' : 'Starter';

  return {
    subject: 'Your Staark API Key',
    html: emailLayout({
      title: 'Your Staark API Key',
      preheader: 'Your API key has been created successfully.',
      content: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:640px;width:100%;background:#111322;border:1px solid #23263a;border-radius:18px;">
          <tr>
            <td style="padding:36px 32px 28px 32px;text-align:center;">

              <div style="width:64px;height:64px;line-height:64px;margin:0 auto 18px auto;border-radius:50%;background:#0f2e2c;border:1px solid #1f5c57;color:#7ef0d2;font-size:30px;font-weight:bold;">
                ✓
              </div>

              <h1 style="margin:0 0 10px 0;font-size:34px;line-height:1.15;color:#ffffff;font-weight:800;">
                Your API key is ready
              </h1>

              <p style="margin:0 0 28px 0;font-size:14px;line-height:1.6;color:#9aa0ba;">
                Keep it safe — for security reasons it will not be shown again.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:#0a0c16;border:1px solid #2a2d45;border-radius:14px;">
                <tr>
                  <td style="padding:18px 18px 8px 18px;text-align:left;">
                    <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#737aa0;font-weight:700;">
                      Plan
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 18px 18px 18px;text-align:left;">
                    <div style="font-size:16px;color:#f5c542;font-weight:700;">
                      ${formattedPlan}
                    </div>
                  </td>
                </tr>
              </table>

              <div style="height:14px;line-height:14px;font-size:14px;">&nbsp;</div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:#16121a;border:1px solid #5b4520;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;text-align:left;font-size:13px;line-height:1.6;color:#f5d37a;">
                    Store your API key securely. If you lose it, generate a new one from your dashboard.
                  </td>
                </tr>
              </table>

              <div style="height:28px;line-height:28px;font-size:28px;">&nbsp;</div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:#0a0c16;border:1px solid #2a2d45;border-radius:14px;">
                <tr>
                  <td style="padding:18px;text-align:left;">
                    <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#737aa0;font-weight:700;margin-bottom:10px;">
                      Quick start
                    </div>

                    <div style="font-size:14px;line-height:1.7;color:#c8cbe0;">
                      Add your API key as a Bearer token in the Authorization header for each request.
                    </div>

                    <div style="margin-top:14px;padding:14px 16px;background:#070810;border:1px solid #242841;border-radius:10px;font-family:monospace;font-size:13px;line-height:1.7;color:#8b85ff;word-break:break-all;">
                      Authorization: Bearer sk_live_staark_••••••••••••
                    </div>
                  </td>
                </tr>
              </table>

              <div style="height:26px;line-height:26px;font-size:26px;">&nbsp;</div>

              <a href="${BASE_URL}"
                style="display:inline-block;padding:14px 22px;border-radius:10px;background:#6c63ff;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                Open Staark Dashboard
              </a>

            </td>
          </tr>
        </table>
      `,
    }),
  };
}

function keyExpiryWarningTemplate(keyName, daysLeft, expiresAt) {
  const expiresDate = new Date(expiresAt * 1000).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const urgencyColor = daysLeft <= 2 ? '#e06070' : '#f97316';

  return {
    subject: `Your API key "${keyName}" expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    html: emailLayout({
      title: 'API Key Expiry Warning',
      preheader: `Your key "${keyName}" expires on ${expiresDate}.`,
      content: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:640px;width:100%;background:#111322;border:1px solid #23263a;border-radius:18px;">
          <tr>
            <td style="padding:36px 32px 28px 32px;text-align:center;">

              <div style="width:64px;height:64px;line-height:64px;margin:0 auto 18px auto;border-radius:50%;background:#2a1a0e;border:1px solid #5b3010;color:${urgencyColor};font-size:30px;">
                &#9888;
              </div>

              <h1 style="margin:0 0 10px 0;font-size:28px;line-height:1.2;color:#ffffff;font-weight:800;">
                API key expiring soon
              </h1>

              <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#c8cbe0;">
                Your key <strong style="color:#fff;">"${keyName}"</strong> will expire in
                <strong style="color:${urgencyColor};">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>
                on ${expiresDate}.
              </p>

              <p style="margin:0 0 28px 0;font-size:14px;line-height:1.6;color:#9aa0ba;">
                To avoid interruptions, generate a new API key before it expires.
              </p>

              <a href="${BASE_URL}/dashboard/keys"
                style="display:inline-block;padding:14px 22px;border-radius:10px;background:#6c63ff;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                Manage API Keys
              </a>

            </td>
          </tr>
        </table>
      `,
    }),
  };
}

// ─── Send helpers ──────────────────────────────────────────────────────────

async function sendVerifyEmail(to, displayName, token) {
  const { subject, html } = verifyEmailTemplate(displayName, token);
  await transporter.sendMail({ from: FROM, to, subject, html });
}

async function sendPasswordReset(to, displayName, token) {
  const { subject, html } = resetPasswordTemplate(displayName, token);
  await transporter.sendMail({ from: FROM, to, subject, html });
}

async function sendApiKeyCreated(to, plan) {
  const { subject, html } = apiKeyCreatedTemplate(plan);
  await transporter.sendMail({ from: FROM, to, subject, html });
}

async function sendKeyExpiryWarning(to, keyName, daysLeft, expiresAt) {
  const { subject, html } = keyExpiryWarningTemplate(keyName, daysLeft, expiresAt);
  await transporter.sendMail({ from: FROM, to, subject, html });
}

export default {
  sendVerifyEmail,
  sendPasswordReset,
  sendApiKeyCreated,
  sendKeyExpiryWarning,
};
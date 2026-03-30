import emailLayout from './layout.js';

const resetPasswordTemplate = ({ resetUrl }) =>
  emailLayout({
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

            <p style="margin:0 0 28px 0;font-size:14px;line-height:1.6;color:#9aa0ba;">
              We received a request to reset your password.
            </p>

            <a href="${resetUrl}"
              style="display:inline-block;padding:14px 22px;border-radius:10px;background:#6c63ff;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
              Reset Password
            </a>

            <p style="margin:20px 0 0 0;font-size:12px;line-height:1.6;color:#7f86a3;">
              If you did not request this, you can safely ignore this email.
            </p>

            <p style="margin:10px 0 0 0;font-size:12px;line-height:1.8;color:#8b85ff;word-break:break-all;">
              ${resetUrl}
            </p>

          </td>
        </tr>
      </table>
    `,
  });

export default resetPasswordTemplate;
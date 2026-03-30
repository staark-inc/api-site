const apiKeyCreatedTemplate = (plan = 'free') => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Staark API Key Created</title>
  </head>
  <body style="margin:0;padding:0;background-color:#070810;font-family:Arial,Helvetica,sans-serif;color:#e8e8f0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#070810;margin:0;padding:0;width:100%;">
      <tr>
        <td align="center" style="padding:32px 16px;">

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;">
            <tr>
              <td style="padding-bottom:18px;">
                <div style="font-size:20px;font-weight:700;letter-spacing:1px;color:#ffffff;">
                  STAARK<span style="color:#8b85ff;">.</span>
                </div>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#111322;border:1px solid #23263a;border-radius:18px;">
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

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0c16;border:1px solid #2a2d45;border-radius:14px;">
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
                        ${plan || 'free'}
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="height:14px;line-height:14px;font-size:14px;">&nbsp;</div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#16121a;border:1px solid #5b4520;border-radius:12px;">
                  <tr>
                    <td style="padding:14px 16px;text-align:left;font-size:13px;line-height:1.6;color:#f5d37a;">
                      Store your API key securely. If you lose it, generate a new one from your dashboard.
                    </td>
                  </tr>
                </table>

                <div style="height:28px;line-height:28px;font-size:28px;">&nbsp;</div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0c16;border:1px solid #2a2d45;border-radius:14px;">
                  <tr>
                    <td style="padding:18px;text-align:left;">
                      <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#737aa0;font-weight:700;margin-bottom:10px;">
                        Quick start
                      </div>

                      <div style="font-size:14px;line-height:1.7;color:#c8cbe0;">
                        Add your API key as a Bearer token in the Authorization header for each request.
                      </div>

                      <div style="margin-top:14px;padding:14px 16px;background:#070810;border:1px solid #242841;border-radius:10px;font-family:monospace;font-size:13px;line-height:1.7;color:#8b85ff;word-break:break-all;">
                        Authorization: Bearer sk_live_staark_••••••••
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="height:26px;line-height:26px;font-size:26px;">&nbsp;</div>

                <a href="https://staark-app.cloud"
                  style="display:inline-block;padding:14px 22px;border-radius:10px;background:#6c63ff;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                  Open Staark Dashboard
                </a>

              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;">
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

export default apiKeyCreatedTemplate;
const emailLayout = ({ title, preheader = '', content }) => `
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

export default emailLayout;
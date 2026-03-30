import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@staark-app.cloud',
    to,
    subject,
    html,
  });
}

export default transporter;
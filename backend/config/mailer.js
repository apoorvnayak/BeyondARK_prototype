const nodemailer = require("nodemailer");

const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

let transporter = null;
if (hasSmtp) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.log(`[mailer] (no SMTP configured, logging instead) To: ${to} | ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || "BeyondArk <no-reply@beyondark.local>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[mailer] failed to send:", err.message);
  }
}

module.exports = { sendMail };

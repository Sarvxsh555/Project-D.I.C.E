import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

let transporterPromise;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  if (process.env.SMTP_HOST) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    );
  } else {
    transporterPromise = nodemailer.createTestAccount().then((testAccount) => {
      console.log(`No SMTP_HOST set - using Ethereal test inbox (${testAccount.user})`);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    });
  }

  return transporterPromise;
}

app.post('/send-reset-email', async (req, res) => {
  const { to, resetLink } = req.body;

  if (!to || !resetLink) {
    return res.status(400).json({ success: false, message: 'to and resetLink are required' });
  }

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@example.com',
      to,
      subject: 'Reset your password',
      text: `Reset your password using this link: ${resetLink}`,
      html: `<p>Click the link below to reset your password. It expires in 30 minutes.</p><p><a href="${resetLink}">${resetLink}</a></p>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Reset email preview: ${previewUrl}`);
    }

    res.json({ success: true, previewUrl: previewUrl || null });
  } catch (err) {
    console.error('Failed to send reset email:', err.message);
    res.status(502).json({ success: false, message: 'Failed to send email' });
  }
});

app.listen(PORT, () => {
  console.log(`Mailer service listening on port ${PORT}`);
});

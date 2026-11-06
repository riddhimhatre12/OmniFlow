import nodemailer from "nodemailer";

/**
 * Vercel Serverless Function: Gmail SMTP Mailer
 * Enables sending emails directly from your @gmail.com account using a Google App Password.
 */
export default async function handler(req: any, res: any) {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Security check: Validate shared secret if configured
  const mailerSecret = process.env.MAILER_SECRET;
  if (mailerSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${mailerSecret}`) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing token" });
    }
  }

  const { to, subject, html } = req.body || {};

  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Missing required fields: to, subject, and html are required." });
  }

  const user = process.env.GMAIL_USER ? process.env.GMAIL_USER.trim() : "";
  const pass = process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, "") : "";

  if (!user || !pass) {
    return res.status(500).json({
      error: "Gmail credentials not configured on Vercel. Set GMAIL_USER and GMAIL_APP_PASSWORD in Vercel environment variables.",
    });
  }

  try {
    const fromName = process.env.GMAIL_FROM_NAME || "Productflow";

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to,
      subject,
      html,
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
    });
  } catch (error: any) {
    console.error("[Vercel Mailer] Gmail SMTP error:", error);
    return res.status(500).json({
      error: error.message || "Failed to send email via Gmail SMTP",
    });
  }
}

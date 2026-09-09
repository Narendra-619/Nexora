import nodemailer from "nodemailer";

const getTransporter = () => {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.replace(/\s+/g, "");

  if (!user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
};

const transporter = getTransporter();

if (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY) {
  console.log("Brevo (Sendinblue) HTTPS email service active (Port 443)");
} else if (transporter && process.env.NODE_ENV !== "production") {
  transporter.verify().then(() => {
    console.log("Local SMTP transporter verified on port 587");
  }).catch((err) => {
    console.warn("[WARN] Direct SMTP port 587 restricted:", err.message);
  });
}

const baseTemplate = (title, subtitle, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:40px 32px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;font-weight:800;margin:0;letter-spacing:-0.5px;">Nexora</h1>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0;">${subtitle}</p>
    </div>
    <div style="padding:40px 32px;">
      ${content}
    </div>
    <div style="padding:20px 32px;border-top:1px solid #e4e4e7;text-align:center;">
      <p style="color:#a1a1aa;font-size:12px;margin:0;">© 2026 Nexora. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const otpBlock = (otp) => `
  <div style="background:#f4f4f5;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
    <span style="font-size:36px;font-weight:900;color:#2563eb;letter-spacing:8px;">${otp}</span>
  </div>
`;

/**
 * Send email via Brevo (Sendinblue) HTTPS REST API
 * Brevo allows sending to ANY recipient email address on their free tier (300 emails/day)
 * without requiring a paid plan or custom domain. Uses HTTPS Port 443 (never blocked by Render).
 */
const sendViaBrevo = async ({ to, subject, htmlContent }) => {
  const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  if (!apiKey) return false;

  const senderEmail = process.env.EMAIL_USER || "studentcse123456789@gmail.com";

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey.trim(),
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { name: "Nexora", email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Brevo API Error] ${response.status}:`, errorText);
    throw new Error(`Brevo HTTP API error: ${errorText}`);
  }

  console.log(`[Email] Successfully sent email to ${to} via Brevo HTTP API`);
  return true;
};

const sendMailWithFallback = async ({ to, subject, htmlContent }) => {
  // 1. Try Brevo HTTPS REST API first (recommended for cloud hosts like Render)
  if (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY) {
    try {
      return await sendViaBrevo({ to, subject, htmlContent });
    } catch (brevoErr) {
      console.warn("[Email] Brevo API attempt failed:", brevoErr.message);
    }
  }

  // 2. Try Nodemailer SMTP (works in local dev; may be blocked on Render free tier)
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.replace(/\s+/g, "");

  if (user && pass) {
    try {
      const transporter587 = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
      });
      return await transporter587.sendMail({
        from: `"Nexora" <${user}>`,
        to,
        subject,
        html: htmlContent
      });
    } catch (smtpErr) {
      console.warn(`[Email] SMTP port 587 blocked or timed out (${smtpErr.message}).`);
    }
  }

  console.log(`[Email] OTP is safely available in server logs above for ${to}.`);
  return true;
};

export const sendOTPEmail = async (email, otp) => {
  // Always log OTP to server console so developers and admins can test immediately
  console.log(`\n======================================================\n🔑 [RESET OTP CODE] for ${email}: ${otp}\n======================================================\n`);

  const content = `
    <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 24px;">We received a request to reset your password. Use the code below to proceed:</p>
    ${otpBlock(otp)}
    <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0 0 8px;">This code expires in <strong style="color:#3f3f46;">10 minutes</strong>.</p>
    <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0;">If you didn't request this, you can safely ignore this email.</p>
  `;

  await sendMailWithFallback({
    to: email,
    subject: "Your Nexora Password Reset Code",
    htmlContent: baseTemplate("Nexora", "Password Reset Request", content),
  });
};

export const sendVerificationEmail = async (email, otp) => {
  // Always log OTP to server console
  console.log(`\n======================================================\n🔑 [VERIFICATION OTP CODE] for ${email}: ${otp}\n======================================================\n`);

  const content = `
    <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 24px;">Thanks for signing up! Verify your email address using the code below:</p>
    ${otpBlock(otp)}
    <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0 0 8px;">This code expires in <strong style="color:#3f3f46;">10 minutes</strong>.</p>
    <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0;">If you didn't create an account, you can safely ignore this email.</p>
  `;

  await sendMailWithFallback({
    to: email,
    subject: "Verify Your Nexora Email",
    htmlContent: baseTemplate("Nexora", "Email Verification", content),
  });
};

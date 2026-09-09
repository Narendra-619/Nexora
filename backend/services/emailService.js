import nodemailer from "nodemailer";

const getTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
};

const transporter = getTransporter();

if (transporter) {
  transporter.verify().then(() => {
    console.log("Email transporter verified");
  }).catch((err) => {
    console.error("Email transporter verification failed:", err.message);
  });
} else {
  console.warn("[WARN] EMAIL_USER or EMAIL_PASS not configured in environment.");
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

const sendMailWithFallback = async (mailOptions) => {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.replace(/\s+/g, "");

  if (!user || !pass) {
    const missing = [];
    if (!user) missing.push("EMAIL_USER");
    if (!pass) missing.push("EMAIL_PASS");
    throw new Error(`Email credentials missing on server (${missing.join(", ")}). Please add them to your Render Dashboard Environment Variables.`);
  }

  // 1. Try Port 465 (SSL)
  try {
    const transporter465 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
    return await transporter465.sendMail({ from: `"Nexora" <${user}>`, ...mailOptions });
  } catch (err465) {
    console.warn(`[Email] Port 465 attempt failed (${err465.message}). Retrying via port 587 (STARTTLS)...`);

    // 2. Fallback to Port 587 (STARTTLS)
    const transporter587 = nodemailer.createTransport({
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
    return await transporter587.sendMail({ from: `"Nexora" <${user}>`, ...mailOptions });
  }
};

export const sendOTPEmail = async (email, otp) => {
  const content = `
    <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 24px;">We received a request to reset your password. Use the code below to proceed:</p>
    ${otpBlock(otp)}
    <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0 0 8px;">This code expires in <strong style="color:#3f3f46;">10 minutes</strong>.</p>
    <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0;">If you didn't request this, you can safely ignore this email.</p>
  `;

  await sendMailWithFallback({
    to: email,
    subject: "Your Nexora Password Reset Code",
    html: baseTemplate("Nexora", "Password Reset Request", content),
  });
};

export const sendVerificationEmail = async (email, otp) => {
  const content = `
    <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 24px;">Thanks for signing up! Verify your email address using the code below:</p>
    ${otpBlock(otp)}
    <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0 0 8px;">This code expires in <strong style="color:#3f3f46;">10 minutes</strong>.</p>
    <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0;">If you didn't create an account, you can safely ignore this email.</p>
  `;

  await sendMailWithFallback({
    to: email,
    subject: "Verify Your Nexora Email",
    html: baseTemplate("Nexora", "Email Verification", content),
  });
};

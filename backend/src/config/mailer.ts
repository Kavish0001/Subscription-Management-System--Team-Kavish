import nodemailer from 'nodemailer';
import { env } from './env';

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

function generateProfessionalTemplate(title: string, preheader: string, content: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <span style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden">${preheader}</span>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;">
                <tr>
                  <td style="padding: 40px 48px; background-color: #ffffff;">
                    ${content}
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f1f5f9; padding: 24px 48px; text-align: center;">
                    <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 20px;">
                      &copy; ${new Date().getFullYear()} SubMS Platform. All rights reserved.<br>
                      Secure enterprise subscription management.
                    </p>
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

export async function sendResetPasswordEmail(to: string, otp: string) {
  const content = `
    <h1 style="margin: 0 0 24px; color: #0f172a; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Password Reset Code</h1>
    <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 24px;">
      We received a request to reset the password associated with this email address. Please use the following 6-digit One-Time Password (OTP) on the portal to securely set a new password:
    </p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
      <tr>
        <td align="center">
          <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #94a3b8; color: #0f172a; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 16px 32px; border-radius: 8px;">
            ${otp}
          </div>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 8px; color: #475569; font-size: 15px; line-height: 24px;">
      For security reasons, this OTP will automatically expire in exactly 1 hour.
    </p>
    <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 24px;">
      If you did not request a password reset, please completely ignore this email. Your dashboard security is intact.
    </p>
  `;

  await mailer.sendMail({
    from: `"SubMS Security" <${env.SMTP_USER}>`,
    to,
    subject: 'Your Password Reset OTP - SubMS',
    html: generateProfessionalTemplate('Password Reset OTP', 'Your one-time password reset code.', content),
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  const content = `
    <h1 style="margin: 0 0 24px; color: #0f172a; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Welcome to SubMS, ${name}!</h1>
    <p style="margin: 0 0 20px; color: #334155; font-size: 16px; line-height: 24px;">
      We are absolutely thrilled to welcome you to the platform. Your enterprise portal account has been successfully generated and activated in our system.
    </p>
    <p style="margin: 0 0 32px; color: #334155; font-size: 16px; line-height: 24px;">
      You can now log in securely at any time to monitor your active recurring plans, review extensive historic invoices, and manage your billing profiles autonomously.
    </p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
      <tr>
        <td align="center">
          <a href="${env.FRONTEND_URL}/login" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">Access Your Portal</a>
        </td>
      </tr>
    </table>
    <p style="margin: 0; color: #475569; font-size: 15px; line-height: 24px;">
      If you ever need any technical assistance or account management, our dedicated support team is always available to help.
    </p>
  `;

  await mailer.sendMail({
    from: `"SubMS Portal" <${env.SMTP_USER}>`,
    to,
    subject: 'Welcome to SubMS! Your account is active.',
    html: generateProfessionalTemplate('Welcome to SubMS', 'Your new portal account has been activated successfully.', content),
  });
}

export async function sendVerificationEmail(to: string, name: string, otp: string) {
  const content = `
    <h1 style="margin: 0 0 24px; color: #0f172a; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Verify your identity, ${name}</h1>
    <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 24px;">
      Welcome to SubMS! To complete your registration and secure your profile, we need to quickly verify your email address. Please enter the following 6-digit One-Time Password (OTP) in the application:
    </p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
      <tr>
        <td align="center">
          <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #94a3b8; color: #0f172a; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 16px 32px; border-radius: 8px;">
            ${otp}
          </div>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 24px;">
      This verification code is strictly tied to your account registration request. Do not share this code internally. 
    </p>
    <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 24px;">
      If you did not initiate this sign-up process, please entirely ignore this message.
    </p>
  `;

  await mailer.sendMail({
    from: `"SubMS Identity" <${env.SMTP_USER}>`,
    to,
    subject: 'Action Required: Your Verification OTP Code',
    html: generateProfessionalTemplate('Email Verification OTP', 'Action required to protect your new account.', content),
  });
}

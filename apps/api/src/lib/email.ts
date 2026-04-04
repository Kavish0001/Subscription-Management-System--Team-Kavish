import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: env.SMTP_USER && env.SMTP_PASS ? {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  } : undefined
});

function getBaseTemplate(content: string) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; color: #1e293b;">
      <div style="background-color: #4f46e5; padding: 24px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Subscription System</h1>
      </div>
      <div style="padding: 32px; line-height: 1.6;">
        ${content}
      </div>
      <div style="background-color: #f8fafc; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} Subscription System Team. All rights reserved.</p>
        <p style="margin: 4px 0 0;">You are receiving this because you signed up for our services.</p>
      </div>
    </div>
  `;
}

export const mailer = {
  async checkConnection() {
    try {
      await transporter.verify();
      logger.info('SMTP connection established successfully');
      return true;
    } catch (error) {
      logger.error({ err: error }, 'SMTP connection failed');
      return false;
    }
  },

  async sendMail({ to, subject, text, html }: { to: string; subject: string; text?: string; html?: string }) {
    try {
      const info = await transporter.sendMail({
        from: env.MAIL_FROM,
        to,
        subject,
        text,
        html
      });
      logger.info({ messageId: info.messageId }, 'Email sent');
      return info;
    } catch (error) {
      logger.error({ err: error }, 'Failed to send email');
      throw error;
    }
  },

  async sendOtp(to: string, otp: string) {
    const html = getBaseTemplate(`
      <h2 style="color: #0f172a; margin-top: 0;">Email Verification</h2>
      <p>Thank you for signing up! Please use the following code to verify your email address:</p>
      <div style="background-color: #f1f5f9; border-radius: 6px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4f46e5;">${otp}</span>
      </div>
      <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
    `);

    return this.sendMail({
      to,
      subject: 'Verify your email address - Subscription System',
      text: `Your verification code is: ${otp}`,
      html
    });
  },

  async sendPasswordReset(to: string, resetLink: string) {
    const html = getBaseTemplate(`
      <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to choose a new one:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">If the button above doesn't work, copy and paste the link below into your browser:</p>
      <p style="color: #64748b; font-size: 14px; word-break: break-all;">${resetLink}</p>
      <p style="color: #64748b; font-size: 14px;">This link will expire in 1 hour. If you didn't request a password reset, no further action is required.</p>
    `);

    return this.sendMail({
      to,
      subject: 'Reset your password - Subscription System',
      text: `To reset your password, please use the following link: ${resetLink}`,
      html
    });
  }
};

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { sendResetPasswordEmail, sendWelcomeEmail, sendVerificationEmail } from '../../config/mailer';
import { createError } from '../../middleware/error-handler';
import { env } from '../../config/env';

export async function loginService(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw createError('Account not exist', 404);
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw createError('Invalid password', 401);
  if (!user.isActive) throw createError('Account is inactive', 403);
  if (!user.isEmailVerified) throw createError('Please verify your email address first', 403);

  const payload = { userId: user.id, role: user.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: { id: user.id, email: user.email, role: user.role },
  };
}

export async function signupService(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw createError('Email already exists', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');

  const user = await prisma.$transaction(async (tx: any) => {
    const newUser = await tx.user.create({
      data: { email, passwordHash, role: 'portal_user', emailVerifyTokenHash: tokenHash },
    });
    const contact = await tx.contact.create({
      data: { userId: newUser.id, name, email, isDefault: true },
    });
    await tx.address.createMany({
      data: [
        { contactId: contact.id, type: 'billing', line1: '', city: '', country: 'India' },
        { contactId: contact.id, type: 'shipping', line1: '', city: '', country: 'India' },
      ],
    });
    return newUser;
  });

  sendVerificationEmail(user.email, name, otp).catch(console.error);

  return { message: 'Registration successful! Please check your email to verify your account.' };
}

export async function verifyEmailConfirmService(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const user = await prisma.user.findFirst({
    where: { emailVerifyTokenHash: tokenHash },
    include: { contacts: true }
  });
  
  if (!user) throw createError('Invalid or expired verification OTP', 400);

  await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, emailVerifyTokenHash: null },
  });

  const name = user.contacts?.[0]?.name ?? 'User';
  sendWelcomeEmail(user.email, name).catch(console.error);
  
  return { message: 'Email completely verified! You can now log in.' };
}

export async function resetPasswordRequestService(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // silently succeed to prevent email enumeration

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: expiresAt },
  });

  await sendResetPasswordEmail(email, otp);
}

export async function resetPasswordConfirmService(token: string, newPassword: string) {
  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { gt: new Date() },
    },
  });
  if (!user) throw createError('Invalid or expired OTP', 400);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetPasswordTokenHash: null, resetPasswordExpiresAt: null },
  });
}

export async function refreshService(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) throw createError('Unauthorized', 401);
  const newPayload = { userId: user.id, role: user.role };
  return {
    accessToken: signAccessToken(newPayload),
    refreshToken: signRefreshToken(newPayload),
  };
}

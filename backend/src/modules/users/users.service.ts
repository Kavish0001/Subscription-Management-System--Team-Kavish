import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { createError } from '../../middleware/error-handler';

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, email: true, role: true, isActive: true, createdAt: true,
      contacts: { where: { isDefault: true }, select: { name: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, isActive: true,
      contacts: { include: { addresses: true } } },
  });
  if (!user) throw createError('User not found', 404);
  return user;
}

export async function createInternalUser(data: { email: string; name: string; phone?: string; role: 'internal_user' | 'portal_user' }) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw createError('Email already exists', 409);
  const passwordHash = await bcrypt.hash('TempPass@123', 12);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: data.email, passwordHash, role: data.role } });
    await tx.contact.create({ data: { userId: user.id, name: data.name, email: data.email, phone: data.phone, isDefault: true } });
    return tx.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, role: true, isActive: true } });
  });
}

export async function updateUser(id: string, data: { role?: string; isActive?: boolean }) {
  return prisma.user.update({ where: { id }, data, select: { id: true, email: true, role: true, isActive: true } });
}

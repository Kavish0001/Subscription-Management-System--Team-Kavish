import { prisma } from '../../lib/prisma';
import { createError } from '../../middleware/error-handler';

export async function getMyContacts(userId: string) {
  return prisma.contact.findMany({
    where: { userId },
    include: { addresses: true },
  });
}

export async function listContacts() {
  return prisma.contact.findMany({ include: { addresses: true, user: { select: { email: true, role: true } } }, orderBy: { createdAt: 'desc' } });
}

export async function getContactById(id: string) {
  const c = await prisma.contact.findUnique({ where: { id }, include: { addresses: true } });
  if (!c) throw createError('Contact not found', 404);
  return c;
}

export async function createContact(data: { userId?: string; name: string; email?: string; phone?: string }) {
  return prisma.contact.create({ data, include: { addresses: true } });
}

export async function updateContact(id: string, data: { name?: string; email?: string; phone?: string }) {
  return prisma.contact.update({ where: { id }, data, include: { addresses: true } });
}

export async function updateAddress(id: string, data: { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string }) {
  return prisma.address.update({ where: { id }, data });
}

export async function createAddress(contactId: string, data: { type: 'billing' | 'shipping'; line1: string; line2?: string; city: string; state?: string; postalCode?: string; country?: string }) {
  return prisma.address.create({ data: { contactId, ...data } });
}

import 'dotenv/config';

import argon2 from 'argon2';

import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@1234';
  const adminName = process.env.ADMIN_NAME ?? 'System Admin';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingAdmin) {
    console.log(`Admin user ${adminEmail} already exists`);
    return;
  }

  const passwordHash = await argon2.hash(adminPassword);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      role: UserRole.admin,
      contacts: {
        create: {
          name: adminName,
          isDefault: true,
          addresses: {
            create: {
              type: 'billing',
              line1: 'Seed Address',
              city: 'Ahmedabad',
              state: 'Gujarat',
              postalCode: '380001',
              country: 'India',
              isDefault: true
            }
          }
        }
      }
    },
    include: { contacts: true }
  });

  console.log(`Seeded admin ${admin.email} (${admin.contacts[0]?.name ?? adminName})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

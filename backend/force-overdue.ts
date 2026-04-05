import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // Make 90% of invoices overdue if they are paid or draft
  const invoices = await prisma.invoice.findMany();
  for(const inv of invoices) {
    if(Math.random() > 0.1) {
       await prisma.invoice.update({
          where: { id: inv.id },
          data: { status: 'overdue', dueDate: cutoff }
       });
       await prisma.payment.deleteMany({ where: { invoiceId: inv.id }}); // remove payments so it's truly unpaid
    }
  }
  console.log('Forced massive amounts of invoices to be OVERDUE!');
}

main().catch(console.error).finally(() => prisma.$disconnect());

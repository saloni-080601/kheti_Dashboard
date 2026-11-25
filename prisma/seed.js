const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Removing dummy records...');
  await prisma.expense.deleteMany();
  await prisma.cropSale.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.harvestLog.deleteMany();
  await prisma.irrigationLog.deleteMany();
  await prisma.machineryLog.deleteMany();
  await prisma.machinery.deleteMany();
  await prisma.labourPayment.deleteMany();
  await prisma.labourLog.deleteMany();
  await prisma.labourer.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.crop.deleteMany();
  await prisma.fieldSection.deleteMany();
  await prisma.field.deleteMany();
  await prisma.farm.deleteMany();
  console.log('Database is empty. Add real farms from the app.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@libertine.local';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log('Compte admin déjà présent, seed ignoré.');
    return;
  }

  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
  const now = new Date();

  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      birthDate: new Date('1990-01-01'),
      role: 'ADMIN',
      termsAcceptedAt: now,
      ageConfirmedAt: now,
    },
  });

  console.log('Compte admin créé :', adminEmail, '/ ChangeMe123! (à changer)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

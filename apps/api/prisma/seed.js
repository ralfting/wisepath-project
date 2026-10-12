/**
 * Seed: first data for a local database.
 * Creates (or updates) a demo account you can log in with right away.
 * Safe to run more than once.
 *
 * Run: pnpm --filter @wisepath/api db:seed
 * In Docker: docker compose exec api pnpm db:seed
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const DEMO_USER = {
  email: 'demo@wisepath.dev',
  password: 'wisepath-demo',
  name: 'Demo Learner',
};

async function main() {
  const password = await bcrypt.hash(DEMO_USER.password, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: { name: DEMO_USER.name, password },
    create: { email: DEMO_USER.email, name: DEMO_USER.name, password },
  });
  console.log(`Seeded demo user ${user.email} (password: ${DEMO_USER.password})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

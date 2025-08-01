const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const WAIT_MS = parseInt(process.env.NEON_WAKE_WAIT_MS || '15000', 10);

async function main() {
  console.log('Sending initial ping to Neon DB...');
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.error('Initial ping failed (expected if database is asleep):', err.message);
  }

  console.log(`Waiting ${WAIT_MS / 1000} seconds for the database to wake up...`);
  await new Promise((res) => setTimeout(res, WAIT_MS));

  console.log('Sending second ping...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Second ping succeeded. Database should be awake.');
  } catch (err) {
    console.error('Second ping failed:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

// prisma/seed.mjs
import { PrismaClient } from '../src/generated/prisma/index.js';                      // default-import CommonJS package  [oai_citation:5‡dev.to](https://dev.to/isnan__h/seeding-your-database-with-prisma-orm-935?utm_source=chatgpt.com)
import { readFileSync } from 'fs';                      // ESM import of Node builtin  [oai_citation:6‡blog.sethcorker.com](https://blog.sethcorker.com/question/how-do-you-seed-a-database-with-prisma/?utm_source=chatgpt.com)
import { join } from 'path';

const prisma = new PrismaClient();

// 1. Upsert a demo user so we have a valid userId
const { id: demoUserId } = await prisma.user.upsert({
  where: { email: 'demo@inmywords.app' },
  update: {},
  create: {
    email: 'demo@inmywords.app',
    passwordHash: '<hashed-password-placeholder>'
  }
});

async function main() {
  const dataPath = join(process.cwd(), 'prisma', 'data', 'criteria.json');
  const raw = readFileSync(dataPath, 'utf-8');
  const criteriaArr = JSON.parse(raw);

  for (const crit of criteriaArr) {
    if (!crit.code) {
      console.warn(`Skipping criterion without code. Title: ${crit.title}`);
      continue;
    }
    const created = await prisma.criteria.create({
      data: {
        code: crit.code,
        title: crit.title,
        description: crit.description || null,
      },
    });

    for (const sub of crit.subcriteria || []) {
      if (!sub.code) {
        console.warn(`Skipping subcriterion without code under ${crit.code}. Title: ${sub.title}`);
        continue;
      }
      await prisma.subcriteria.create({
        data: {
          code: sub.code,
          title: sub.title,
          description: sub.description || null,
          criterionId: created.id,
        },
      });
    }
  }

  // 3. Seed a demo entry
  await prisma.entry.create({
    data: {
      userId: demoUserId,
      title: 'Demo entry: Reflections on criterion A',
      content: 'Here is a sample journal entry related to my experiences.',
      // Optional: link to a specific criterion/subcriterion
      // criterionId: null,
      // subcriterionId: null,
    },
  });

  console.log('🟢 Seed complete');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
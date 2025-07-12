import pkg from '../src/generated/prisma/index.js';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  // Create top-level Criteria tags
  const criteriaA = await prisma.tag.upsert({
    where: { code: 'A' },
    update: {},
    create: {
      name: 'A. Persistent deficits in social communication and interaction',
      code: 'A',
      description: 'Persistent deficits in social communication and social interaction across contexts',
    },
  });

  const criteriaB = await prisma.tag.upsert({
    where: { code: 'B' },
    update: {},
    create: {
      name: 'B. Restricted, repetitive patterns of behavior, interests, or activities',
      code: 'B',
      description: 'Restricted, repetitive patterns of behavior',
    },
  });

  const criteriaC = await prisma.tag.upsert({
    where: { code: 'C' },
    update: {},
    create: {
      name: 'C. Symptoms present in early developmental period',
      code: 'C',
      description: 'Symptoms must be present in early development',
    },
  });

  const criteriaD = await prisma.tag.upsert({
    where: { code: 'D' },
    update: {},
    create: {
      name: 'D. Symptoms cause significant impairment',
      code: 'D',
      description: 'Symptoms cause significant impairment in functioning',
    },
  });

  const criteriaE = await prisma.tag.upsert({
    where: { code: 'E' },
    update: {},
    create: {
      name: 'E. Not better explained by intellectual disability',
      code: 'E',
      description: 'Disturbances not better explained by intellectual disability',
    },
  });

  // Add example subcriteria for A
  const subcriteriaA = [
    {
      name: 'A1. Deficits in social-emotional reciprocity',
      code: 'A1',
      description: 'Abnormal social approach and failure of normal back-and-forth conversation',
      parentId: criteriaA.id,
    },
    {
      name: 'A2. Deficits in nonverbal communicative behaviors',
      code: 'A2',
      description: 'Poorly integrated verbal and nonverbal communication',
      parentId: criteriaA.id,
    },
    {
      name: 'A3. Deficits in developing and maintaining relationships',
      code: 'A3',
      description: 'Difficulties in adjusting behavior to suit different social contexts',
      parentId: criteriaA.id,
    },
  ];

  for (const sub of subcriteriaA) {
    await prisma.tag.upsert({
      where: { code: sub.code },
      update: {},
      create: sub,
    });
  }

  const subcriteriaB = [
    {
      name: 'B1. Stereotyped or repetitive motor movements',
      code: 'B1',
      description: 'Echolalia, idiosyncratic phrases, or repetitive behaviors',
      parentId: criteriaB.id,
    },
    {
      name: 'B2. Insistence on sameness',
      code: 'B2',
      description: 'Inflexible adherence to routines, ritualized patterns',
      parentId: criteriaB.id,
    },
  ];

  for (const sub of subcriteriaB) {
    await prisma.tag.upsert({
      where: { code: sub.code },
      update: {},
      create: sub,
    });
  }

  // Create demo users
  const user1 = await prisma.user.upsert({
    where: { email: 'demo1@example.com' },
    update: {},
    create: {
      email: 'demo1@example.com',
      username: 'demo1',
      passwordHash: 'hashedpassword1',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'demo2@example.com' },
    update: {},
    create: {
      email: 'demo2@example.com',
      username: 'demo2',
      passwordHash: 'hashedpassword2',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'demo3@example.com' },
    update: {},
    create: {
      email: 'demo3@example.com',
      username: 'demo3',
      passwordHash: 'hashedpassword3',
    },
  });

  // Create example entries for user1
  await prisma.entry.create({
    data: {
      title: 'User 1: Social Reflection',
      content: 'Reflections on social interaction and communication today.',
      userId: user1.id,
      tags: {
        connect: [{ id: criteriaA.id }],
      },
    },
  });

  await prisma.entry.create({
    data: {
      title: 'User 1: Routine Note',
      content: 'Notes about routines and repetitive patterns.',
      userId: user1.id,
      tags: {
        connect: [{ id: criteriaB.id }],
      },
    },
  });

  // Create example entry for user2
  await prisma.entry.create({
    data: {
      title: 'User 2: Early Development Thoughts',
      content: 'Thinking about developmental milestones and early signs.',
      userId: user2.id,
      tags: {
        connect: [{ id: criteriaC.id }],
      },
    },
  });

  console.log('🌱 Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
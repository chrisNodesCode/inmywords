import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma, { disconnectPrisma } from '../src/api/prismaClient.js';

async function main() {
  // 1. Upsert demo user with fixed UUID
  const user = await prisma.user.upsert({
    where: { id: 'f6cd0a0c-61f3-4db4-8a85-0f863d414752' },
    update: {},
    create: {
      id: 'f6cd0a0c-61f3-4db4-8a85-0f863d414752',
      email: 'demo@example.com',
      username: 'demouser',
      passwordHash: 'hashedpassword',
    },
  });

  // 2. Upsert user preference
  await prisma.preference.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      editorBg: '#ffffff',
      editorWidth: 'comfortable',
    },
  });

  // 3. Seed a precursor with pattern and model data
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const criteriaPath = path.join(__dirname, 'data', 'criteria.json');
  const criteriaData = JSON.parse(readFileSync(criteriaPath, 'utf-8'));

  await prisma.precursor.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Autism Diagnostic Criteria',
      description: 'DSM-5 autism spectrum disorder diagnostic criteria',
      pattern: {
        group: 'Diagnostic Criteria',
        subgroup: 'Subcriteria',
        entry: 'Observation',
      },
      modelData: criteriaData,
    },
  });

  // 4. Upsert demo notebook
  const notebook = await prisma.notebook.upsert({
    where: { id: '00000000-0000-0000-0000-000000000000' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000000',
      title: 'Demo Notebook',
      description: 'A notebook for demo purposes',
      userId: user.id,
    },
  });

  // 5. Create metadata tags for this notebook
  const tagData = [
    { code: 'important', name: 'Important' },
    { code: 'todo', name: 'To Do' },
    { code: 'idea', name: 'Idea' },
  ];
  const tags = [];
  for (const info of tagData) {
    const tag = await prisma.tag.upsert({
      where: { code: info.code },
      update: {},
      create: {
        code: info.code,
        name: info.name,
        notebookId: notebook.id,
      },
    });
    tags.push(tag);
  }

  // 6. Create groups inside the notebook
  const groupData = [
    { name: 'Group 1' },
    { name: 'Group 2' },
  ];
  const groups = [];
  for (const info of groupData) {
    const group = await prisma.group.create({
      data: {
        name: info.name,
        notebookId: notebook.id,
      },
    });
    groups.push(group);
  }

  // 7. Create subgroups under each group
  const subgroupData = [
    { name: 'Subgroup A', groupId: groups[0].id },
    { name: 'Subgroup B', groupId: groups[0].id },
    { name: 'Subgroup C', groupId: groups[1].id },
  ];
  const subgroups = [];
  for (const info of subgroupData) {
    const subgroup = await prisma.subgroup.create({
      data: {
        name: info.name,
        groupId: info.groupId,
      },
    });
    subgroups.push(subgroup);
  }

  // 8. Create entries in each subgroup, attaching some tags
  const entryData = [
    {
      title: 'Entry 1A',
      content: 'Content for Subgroup A',
      subgroupId: subgroups[0].id,
      tagIds: [tags[0].id, tags[1].id],
      status: 'in_progress',
    },
    {
      title: 'Entry 1B',
      content: 'Content for Subgroup B',
      subgroupId: subgroups[1].id,
      tagIds: [tags[1].id, tags[2].id],
      status: 'none',
    },
    {
      title: 'Entry 2C',
      content: 'Content for Subgroup C',
      subgroupId: subgroups[2].id,
      tagIds: [tags[2].id, tags[0].id],
      status: 'complete',
    },
  ];
  for (const info of entryData) {
    await prisma.entry.create({
      data: {
        title: info.title,
        content: info.content,
        userId: user.id,
        subgroupId: info.subgroupId,
        status: info.status,
        tags: {
          connect: info.tagIds.map(id => ({ id })),
        },
      },
    });
  }

  console.log('🌱 Seed complete');
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });

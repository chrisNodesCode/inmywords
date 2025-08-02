import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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

  // 3. Upsert demo notebook
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

  // 4. Create metadata tags for this notebook
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

  // 5. Create groups inside the notebook
  const groupData = [
    { name: 'Group 1' },
    { name: 'Group 2' },
  ];
  const groups = [];
  for (const [idx, info] of groupData.entries()) {
    const group = await prisma.group.create({
      data: {
        name: info.name,
        notebookId: notebook.id,
        user_sort: idx,
      },
    });
    groups.push(group);
  }

  // 6. Create subgroups under each group
  const subgroupData = [
    { name: 'Subgroup A', groupId: groups[0].id },
    { name: 'Subgroup B', groupId: groups[0].id },
    { name: 'Subgroup C', groupId: groups[1].id },
  ];
  const subgroups = [];
  const subIndexMap = {};
  for (const info of subgroupData) {
    const idx = subIndexMap[info.groupId] ?? 0;
    const subgroup = await prisma.subgroup.create({
      data: {
        name: info.name,
        groupId: info.groupId,
        user_sort: idx,
      },
    });
    subIndexMap[info.groupId] = idx + 1;
    subgroups.push(subgroup);
  }

  // 7. Create entries in each subgroup, attaching some tags
  const entryData = [
    {
      title: 'Entry 1A',
      content: 'Content for Subgroup A',
      subgroupId: subgroups[0].id,
      tagIds: [tags[0].id, tags[1].id],
    },
    {
      title: 'Entry 1B',
      content: 'Content for Subgroup B',
      subgroupId: subgroups[1].id,
      tagIds: [tags[1].id, tags[2].id],
    },
    {
      title: 'Entry 2C',
      content: 'Content for Subgroup C',
      subgroupId: subgroups[2].id,
      tagIds: [tags[2].id, tags[0].id],
    },
  ];
  const entryIndexMap = {};
  for (const info of entryData) {
    const idx = entryIndexMap[info.subgroupId] ?? 0;
    await prisma.entry.create({
      data: {
        title: info.title,
        content: info.content,
        userId: user.id,
        subgroupId: info.subgroupId,
        user_sort: idx,
        tags: {
          connect: info.tagIds.map(id => ({ id })),
        },
      },
    });
    entryIndexMap[info.subgroupId] = idx + 1;
  }

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

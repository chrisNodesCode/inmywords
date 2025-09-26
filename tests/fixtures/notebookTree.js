export const notebook = {
  id: 'nb1',
  title: 'Field Notes',
  description: 'Research notebook',
  userId: 'user-123',
  user_notebook_tree: ['Group', 'Subgroup', 'Entry'],
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-03T12:00:00.000Z'),
};

export const groups = [
  {
    id: 'g1',
    name: 'Research',
    description: 'Primary backlog',
    user_sort: 0,
    notebookId: notebook.id,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  },
  {
    id: 'g2',
    name: 'Archive',
    description: null,
    user_sort: 1,
    notebookId: notebook.id,
    createdAt: new Date('2024-01-04T00:00:00.000Z'),
    updatedAt: new Date('2024-01-05T00:00:00.000Z'),
  },
];

export const subgroupsByGroup = {
  g1: [
    {
      id: 'sg1',
      name: 'Articles',
      description: null,
      user_sort: 0,
      groupId: 'g1',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    },
    {
      id: 'sg2',
      name: 'Interviews',
      description: 'Qualitative notes',
      user_sort: 1,
      groupId: 'g1',
      createdAt: new Date('2024-01-02T00:00:00.000Z'),
      updatedAt: new Date('2024-01-03T00:00:00.000Z'),
    },
  ],
  g2: [
    {
      id: 'sg3',
      name: 'Past Experiments',
      description: null,
      user_sort: 0,
      groupId: 'g2',
      createdAt: new Date('2023-12-30T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    },
  ],
};

export const entriesBySubgroup = {
  sg1: [
    {
      id: 'e1',
      title: 'Protein research',
      content: '<p>Findings…</p>',
      status: 'none',
      archived: false,
      user_sort: 0,
      subgroupId: 'sg1',
      userId: notebook.userId,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      tags: [
        { id: 't1', name: 'Biology', code: 'bio' },
      ],
    },
    {
      id: 'e2',
      title: 'Synthesis backlog',
      content: '<p>Draft</p>',
      status: 'draft',
      archived: false,
      user_sort: 1,
      subgroupId: 'sg1',
      userId: notebook.userId,
      createdAt: new Date('2024-01-02T00:00:00.000Z'),
      updatedAt: new Date('2024-01-04T00:00:00.000Z'),
      tags: [
        { id: 't2', name: 'Writing', code: 'write' },
      ],
    },
    {
      id: 'e3',
      title: 'Archived interview',
      content: '<p>Hidden</p>',
      status: 'none',
      archived: true,
      user_sort: 2,
      subgroupId: 'sg1',
      userId: notebook.userId,
      createdAt: new Date('2024-01-03T00:00:00.000Z'),
      updatedAt: new Date('2024-01-03T12:00:00.000Z'),
      tags: [],
    },
  ],
  sg2: [
    {
      id: 'e4',
      title: 'Interview notes',
      content: '<p>Summaries</p>',
      status: 'review',
      archived: false,
      user_sort: 0,
      subgroupId: 'sg2',
      userId: notebook.userId,
      createdAt: new Date('2024-01-02T00:00:00.000Z'),
      updatedAt: new Date('2024-01-03T00:00:00.000Z'),
      tags: [
        { id: 't3', name: 'Qual', code: 'qual' },
      ],
    },
  ],
  sg3: [
    {
      id: 'e5',
      title: 'Legacy findings',
      content: '<p>Old data</p>',
      status: 'done',
      archived: true,
      user_sort: 0,
      subgroupId: 'sg3',
      userId: notebook.userId,
      createdAt: new Date('2023-12-30T00:00:00.000Z'),
      updatedAt: new Date('2023-12-31T00:00:00.000Z'),
      tags: [],
    },
  ],
};

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getGroupById(id) {
  return groups.find(group => group.id === id) ?? null;
}

export function getSubgroupById(id) {
  return Object.values(subgroupsByGroup)
    .flat()
    .find(subgroup => subgroup.id === id) ?? null;
}

export const FEATURE_FLAG_DEFAULTS = {
  useSharedPrismaClient: true,
  useBatchedNotebookTreeEndpoint: true,
};

export const FEATURE_FLAG_ENVIRONMENT_MAP = {
  useSharedPrismaClient: 'FEATURE_USE_SHARED_PRISMA_CLIENT',
  useBatchedNotebookTreeEndpoint: 'FEATURE_USE_BATCHED_NOTEBOOK_TREE',
};

export const FEATURE_FLAG_METADATA = {
  useSharedPrismaClient: {
    description:
      'Toggle the shared Prisma client singleton. Disable to fall back to per-request clients for debugging or staged rollbacks.',
    owner: 'backend-platform',
  },
  useBatchedNotebookTreeEndpoint: {
    description:
      'Serve the aggregated notebook tree endpoint instead of the legacy multi-request workflow.',
    owner: 'api-notebooks',
  },
};

export default FEATURE_FLAG_DEFAULTS;

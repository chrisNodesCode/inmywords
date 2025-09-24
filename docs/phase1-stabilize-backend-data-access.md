# Phase 1: Stabilize Backend Data Access

## Goal
Prevent database connection exhaustion and reduce payload sizes by consolidating Prisma usage and shaping API responses for scalable notebook data retrieval.

## Task List

### 1. Centralize Prisma Client Lifecycle
- [ ] Inventory every location constructing `new PrismaClient()`.
- [ ] Design a shared Prisma client factory/singleton pattern compatible with Next.js (supporting hot reload and serverless).
- [ ] Implement the shared client module and replace per-route instantiations.
- [ ] Add regression tests or integration checks to ensure connections are reused.
- [ ] Document usage guidelines for future modules.

### 2. Add Pagination, Filtering, and Projections to APIs
- [ ] Identify high-traffic endpoints (e.g., `/api/entries`, `/api/groups`) lacking pagination.
- [ ] Define request/response schemas supporting `take`, `skip`, cursors, and optional field projections.
- [ ] Update Prisma queries to respect pagination/filter params and limit selected columns.
- [ ] Update API documentation and provide sample client usage.
- [ ] Create unit/integration tests covering paginated responses and projection logic.

### 3. Establish Batched Notebook Tree Queries
- [ ] Map current client fetch flows to understand existing N+1 patterns.
- [ ] Draft a combined hierarchical response contract (e.g., `/api/notebooks/{id}/tree`).
- [ ] Implement the batched endpoint with Prisma `include/select` combinations.
- [ ] Ensure the endpoint reuses the centralized Prisma client and pagination primitives.
- [ ] Validate performance improvements with load tests or representative fixtures.

### 4. Migration & Rollout Support
- [ ] Plan incremental rollout (feature flags or dual endpoints) to avoid client breakage.
- [ ] Communicate migration steps to frontend team, aligning with future data hooks.
- [ ] Monitor database metrics post-launch to confirm reduced connection count and payload size.

# Phase 2: Refactor API & Workflow Orchestration

## Goal
Introduce asynchronous workflow primitives and shared contracts so that API routes can offload heavy work, reuse validated schemas, and remain maintainable as features grow.

## Task List

### 1. Introduce Background Job Infrastructure
- [x] Evaluate queue options compatible with the current deployment (e.g., BullMQ, Cloud Tasks, or Vercel/Edge-compatible alternatives). **Outcome:** Adopt Google Cloud Tasks to align with Vercel deployment constraints while keeping HTTP delivery semantics.
- [x] Select a persistence layer for jobs and configure connection management (reuse Prisma DB or dedicated store like Redis). **Decision:** Continue to rely on the existing Prisma-managed database for metadata/state; no dedicated Redis cluster is required.
- [ ] Implement a job runner/bootstrap module with health checks and graceful shutdown handling.
- [ ] Extract long-running tasks (search indexing, AI enrichment, batch emails) from API routes into discrete jobs.
- [ ] Add retry, dead-letter, and monitoring hooks for operational visibility.

### 2. Establish Eventing & API Orchestration Patterns
- [ ] Map key domain events (entry saved, group reordered, notebook shared) and define payload contracts.
- [ ] Create an internal event bus or lightweight pub/sub abstraction feeding the job queue and webhooks.
- [ ] Update API mutation handlers to emit events instead of performing synchronous follow-up work.
- [ ] Document sequencing/ordering guarantees and idempotency requirements for consumers.
- [ ] Provide sample consumers (e.g., webhook handler, job subscriber) to validate the orchestration flow.

### 3. Codify Shared API Schemas & Clients
- [ ] Inventory existing REST endpoints and align on canonical request/response shapes.
- [ ] Create shared TypeScript schema definitions (Zod or similar) for validation on both server and client.
- [ ] Generate or hand-author typed API client helpers that consume the shared schemas.
- [ ] Refactor API routes to use centralized schema parsing and typed responses.
- [ ] Publish usage guidelines for frontend/backend teams, including error handling patterns.

### 4. Rollout & Operational Readiness
- [ ] Design a phased rollout (feature flags, dual-write strategy) for moving mutations onto the new orchestration stack.
- [ ] Set up dashboards/alerts covering queue latency, job failures, and event throughput.
- [ ] Train the team on debugging workflows with the new tooling and logs.
- [ ] Review security implications (auth for webhooks, scoped service tokens) before production rollout.
- [ ] Schedule a retrospective after initial adoption to collect feedback and iterate.

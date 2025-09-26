# Shared Prisma Client & Notebook Tree Migration Notes

This document captures the rollout plan for the shared Prisma client, the batched `/api/notebooks/[id]/tree` endpoint, and the fallbacks that allow a staged migration. Share this summary with frontend owners and customer success ahead of every promotion to staging or production.

## Feature flags

| Flag | Environment variable | Default | Purpose |
| ---- | -------------------- | ------- | ------- |
| `useSharedPrismaClient` | `FEATURE_USE_SHARED_PRISMA_CLIENT` | `true` | Enables the shared Prisma singleton. Disable to fall back to per-request clients if we need to mitigate connection spikes. |
| `useBatchedNotebookTreeEndpoint` | `FEATURE_USE_BATCHED_NOTEBOOK_TREE` | `true` | Serves the batched notebook tree response. Disable to force clients to continue using the legacy sequential data loaders. |

* Toggle flags via environment variables or the runtime override helper in `src/utils/featureFlags.js` during manual QA sessions.
* Document every flag change in the release notes so frontend teams can correlate telemetry with user reports.

## Coordination checklist

| Task | Owner | Notes |
| ---- | ----- | ----- |
| Share the API response contract (including pagination metadata) with frontend maintainers. | Backend API | Provide sample payloads for both the batched and legacy variants so clients can dual-read during the rollout. |
| Confirm the minimum required version of the web client and native apps. | Frontend leads | Communicate in `#launch-readiness` and pin the message until the migration is complete. |
| Verify that SDKs consuming the tree endpoint handle both the batched meta object and the legacy array structure. | Developer experience | Update TypeScript definitions or generated clients as needed. |
| Schedule regression passes for authentication, notebook CRUD, and tree rendering flows. | QA | Run once with each flag combination before production cut-over. |

## Suggested rollout timeline

1. **Week 1 – Staging burn-in**
   * Enable both flags in staging.
   * Monitor Datadog dashboards (see [Monitoring plan](../observability/monitoring-plan.md)) for Prisma connection counts and endpoint latency.
   * Frontend teams validate loading states, pagination controls, and cached responses.
2. **Week 2 – Canary production users**
   * Enable `useSharedPrismaClient` for the first canary cohort.
   * Keep `useBatchedNotebookTreeEndpoint` disabled; confirm no connection regressions.
   * Update incident runbooks with rollback steps (`export FEATURE_USE_SHARED_PRISMA_CLIENT=false`).
3. **Week 3 – Batched endpoint rollout**
   * Flip on `useBatchedNotebookTreeEndpoint` for 10% of traffic via environment variable overrides.
   * Confirm payload size metrics remain within the expected 95th percentile envelope (< 500 KB).
   * Coordinate with frontend owners to release any final client patches.
4. **Week 4 – General availability**
   * Enable both flags globally once telemetry and user feedback are stable.
   * Announce completion in the engineering release channel and archive the rollout checklist.

## Testing expectations

* `npm run lint` must pass before shipping. Add focused integration tests around the feature flag helper where possible.
* Exercise both flag permutations in Postman or cURL to ensure the `/api/notebooks/[id]/tree` route produces the correct metadata.
* For legacy mode, verify that the frontend continues to fan out requests without regression (groups, subgroups, entries endpoints).

## Post-deployment review cadence

* Schedule a review 48 hours after each production enablement.
* Share the monitoring snapshots (connection counts, latency, payload distributions) alongside qualitative feedback from customer support.
* Use the meeting to decide whether the legacy code paths can be retired. If no regressions are observed for two consecutive reviews, plan the deletion tasks.
* Track action items in the program management board and link back to the relevant flag state.

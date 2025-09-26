# Monitoring plan for shared Prisma client & batched tree endpoint

This plan defines the dashboards and alerts that must accompany the feature-flag rollout.

## Datadog dashboards

1. **Prisma connection pressure**
   * Query: `avg:prisma.client.connections{service:inmywords} by {env}`
   * Widgets: timeseries with deployment markers and a top-list of pods/functions with the highest counts.
   * Expected range: < 20 active connections in production. Highlight anything above 35.
2. **Notebook tree latency**
   * Query: `p95:http.server.duration{route:/api/notebooks/*/tree}` segmented by `feature_variant` (batched vs legacy).
   * Add an overlay for `NODE_ENV` to confirm staging vs production behaviour.
3. **Payload size distribution**
   * Custom log-based metric emitted via `logApiMetric` (`payload_bytes`).
   * Visualize p50/p90/p99 to ensure the batched endpoint remains under 500 KB for 99% of responses.

## Grafana panels

1. **Request volume split**
   * Prometheus query: `sum(rate(http_requests_total{route="/api/notebooks/:id/tree"}[5m])) by (feature_variant)`.
   * Display as stacked area chart to confirm traffic splits during canary rollouts.
2. **Error budget consumption**
   * Query: `sum(rate(http_requests_total{status!~"2..",route="/api/notebooks/:id/tree"}[1h]))`.
   * Pair with an annotation showing feature flag flips.
3. **Shared client lifecycle**
   * Custom metric from logs: count of `[prisma] Instantiated` messages grouped by `mode` to detect unintended churn.

## Alerting rules

| Metric | Threshold | Duration | Action |
| ------ | --------- | -------- | ------ |
| Prisma connections (avg over 5m) | > 35 | 10 minutes | Page on-call backend engineer; consider disabling `useSharedPrismaClient`. |
| Tree latency p95 | > 1500 ms | 15 minutes | Notify API + frontend leads to investigate regressions. |
| Payload size p99 | > 750 KB | 30 minutes | Coordinate with frontend to prune prefetch scopes or temporarily roll back the batched flag. |
| Error rate | > 2% non-2xx responses | 10 minutes | Trigger incident response, gather logs with `feature_variant` tag. |

## Logging hooks

* `src/utils/metrics.js` emits JSON logs with the `metric`, `payloadBytes`, and `featureVariant` fields for ingestion into Datadog log-based metrics.
* `src/api/prismaClient.js` logs a `[prisma] Instantiated ...` message whenever a new client is created. Shipping this into Grafana Loki allows us to watch for runaway instantiations when the shared client flag is disabled.
* The tree API handler records response size, duration, feature variant, and Prisma client mode on every request to support triaging across both logging systems.

## Runbook integration

1. Subscribe the on-call rotation to all alerts above.
2. Link this document in the incident response runbook and in the migration checklist (`docs/api/migration-notes.md`).
3. Capture snapshots of each dashboard before and after the rollout to validate the instrumentation.
4. Include metrics review in the scheduled post-deployment meetings to decide when legacy code can be retired.

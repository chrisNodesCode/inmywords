# Phase 4: Platform Modernization

## Goal
Adopt modern Next.js primitives and deployment patterns to unlock server components, improved caching/streaming, and predictable builds aligned with the refactored API layer.

## Task List

### 1. App Router Migration Plan
- [ ] Inventory existing `pages/` routes, their data dependencies, and blocking middleware.
- [ ] Define migration order prioritizing high-traffic notebook and marketing routes.
- [ ] Establish shared layout, loading, and error boundaries for the App Router tree.
- [ ] Document required code mods (e.g., `getServerSideProps` to Server Components or Route Handlers).
- [ ] Align deployment toggle/feature flag strategy for incremental rollouts.

### 2. Implement Server Components & Actions
- [ ] Identify screens that benefit from server components (heavy data reads, complex composition).
- [ ] Convert targeted routes to server components using Phase 1/2 data loaders.
- [ ] Introduce Server Actions where mutations benefit from streaming/form submissions.
- [ ] Ensure client components remain isolated for interactivity, sharing contexts as needed.
- [ ] Add integration tests or smoke flows confirming hydration boundaries work end-to-end.

### 3. Optimize Routing, Caching & Streaming
- [ ] Configure route segment caching/revalidation policies based on data freshness requirements.
- [ ] Enable incremental static regeneration or full static generation for marketing/public routes.
- [ ] Wire up edge-friendly middleware (e.g., auth, localization) compatible with the App Router.
- [ ] Introduce Suspense-driven streaming for notebook content and progressive data hydration.
- [ ] Validate Lighthouse and Web Vitals impact before/after migration.

### 4. Deployment & DX Readiness
- [ ] Update CI/CD workflows (linting, tests, type checks) for the App Router build artifacts.
- [ ] Refresh local development docs, including dev server commands and environment variables.
- [ ] Coordinate Vercel/hosting configuration (preview deployments, image optimization, edge runtime).
- [ ] Monitor error tracking and logging for regressions during phased rollout.
- [ ] Hold post-migration retro to capture lessons learned and tooling gaps.

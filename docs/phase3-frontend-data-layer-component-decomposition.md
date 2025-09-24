# Phase 3: Frontend Data Layer & Component Decomposition

## Goal
Replace ad-hoc fetch flows and monolithic UI surfaces with cached data hooks and modular components, unlocking responsive notebook interactions aligned with the stabilized backend.

## Task List

### 1. Build Shared Data-Fetching Hooks
- [ ] Audit current client-side fetch calls and identify duplicated logic or inconsistent error handling.
- [ ] Select a caching library (e.g., SWR or React Query) and define global configuration (retry policy, stale times, suspense usage).
- [ ] Create typed hook wrappers (e.g., `useNotebookTree`, `useEntriesPage`) that consume Phase 1/2 API contracts and shared schemas.
- [ ] Implement cache invalidation helpers for create/update/delete workflows and optimistic mutation patterns.
- [ ] Add unit tests or Storybook mocks to ensure hooks handle loading, error, and empty states predictably.

### 2. Decompose DeskSurface & Related Containers
- [ ] Map the responsibilities of `DeskSurface` (data loading, keyboard shortcuts, drag-and-drop, editor state, presentation).
- [ ] Propose a component/module architecture (providers, contexts, utility hooks) that isolates concerns and minimizes re-renders.
- [ ] Incrementally extract data providers and presentation components, reusing the new data hooks.
- [ ] Establish shared keyboard/interaction utilities so cross-cutting behaviors stay centralized.
- [ ] Measure render timings and bundle impact to confirm decomposition improves maintainability/performance.

### 3. Optimize Large Notebook Views
- [ ] Introduce list virtualization for long collections (e.g., entries, subgroups) using React Window/Virtualized or an equivalent.
- [ ] Gate heavy entry content behind lazy-loading or suspense boundaries tied to selection state.
- [ ] Ensure virtualization integrates with drag-and-drop, keyboard navigation, and accessibility semantics.
- [ ] Add loading skeletons or progressive disclosure patterns to maintain perceived responsiveness.
- [ ] Validate memory usage and interaction smoothness with large fixture datasets or profiling tools.

### 4. Rollout & Collaboration
- [ ] Document migration guidance for feature teams adopting the new hooks and component boundaries.
- [ ] Coordinate with design/product on UX changes introduced by virtualization or lazy loading.
- [ ] Establish coding standards/tests (lint rules, testing-library patterns) for data hooks and context providers.
- [ ] Monitor client-side error tracking and performance analytics post-release.
- [ ] Collect developer feedback after the first migrated surfaces to iterate on the architecture.

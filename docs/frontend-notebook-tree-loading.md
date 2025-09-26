# Notebook Tree Data Loading (Current State)

This document captures how the existing client implements notebook tree loading and highlights redundant HTTP round-trips that informed the unified tree endpoint work.

## Primary entry point

* `pages/notebook-dev.js` renders `<DeskSurface />`, which contains all notebook tree orchestration logic.
* `DeskSurface` lives at `src/components/Desk/DeskSurface.jsx` and manages notebook selection, tree state, and editor interactions.

## Initial notebook restoration

1. On mount `DeskSurface` reads `lastNotebookId` from `localStorage`.  
2. If a notebook id exists the component issues `fetch('/api/notebooks/{id}')` to ensure ownership and load notebook metadata.  
3. Once the notebook id is confirmed the component sets local state and triggers downstream data loading (groups, subgroups, entries).

This initial metadata fetch is separate from any tree fetches, so the UI always makes **at least one** HTTP request before drawing the tree.

## Group list loading (`fetchGroups`)

* `fetchGroups` issues `GET /api/groups?notebookId={id}`.  
* Response is normalized (`unwrapPayload`) and stored as top-level tree nodes.  
* This occurs whenever the notebook id changes or a new group is created.

Because this endpoint only returns the group shell, additional requests are required to populate sublevels.

## Subgroup expansion (`loadData` / `reloadNode`)

When a group node is expanded the component calls `loadData(node)`:

1. For `group` nodes it issues `GET /api/subgroups?groupId={groupId}`.  
2. Results are merged into the tree.  
3. `reloadNode` repeats the same request after mutations to refresh cached data.

Each group expansion therefore incurs a **dedicated** network round-trip, even if multiple groups are expanded in quick succession.

## Entry expansion (`loadData` / `reloadEntries`)

For `subgroup` nodes:

1. `loadData` calls `GET /api/entries?subgroupId={subgroupId}`.
2. Entries are filtered on the client to hide archived items unless the archived toggle is active.
3. `reloadEntries` is invoked whenever entries mutate (save, archive, delete) and issues the same request again.

Entries are loaded per subgroup, leading to a growing number of HTTP calls as the user explores deeper into the tree.

## Archived toggle side-effect

Toggling the "Show archived" switch iterates over all subgroups that currently have entry data and re-executes `reloadEntries`. This means a single UI interaction can trigger **N additional `/api/entries` requests** equal to the number of populated subgroups.

## Summary of redundant round-trips

| Interaction | Requests issued |
| ----------- | ---------------- |
| Restore last notebook | 1 × `/api/notebooks/{id}` |
| Initial tree render | 1 × `/api/groups?notebookId=…` |
| Expand each group | 1 × `/api/subgroups?groupId=…` per group |
| Expand each subgroup | 1 × `/api/entries?subgroupId=…` per subgroup |
| Toggle archived flag | 1 × `/api/entries?subgroupId=…` per populated subgroup |

The lack of batching results in dozens of sequential HTTP round-trips for common workflows. The new combined tree endpoint is intended to prefetch these layers in a single request and surface pagination metadata so the client can fetch additional slices only when necessary.

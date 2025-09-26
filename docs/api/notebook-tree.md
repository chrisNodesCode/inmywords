# Notebook Tree API

The `GET /api/notebooks/{id}/tree` endpoint returns a hierarchical view of a notebook, optionally including pre-fetched subgroups and entries. It combines data that previously required multiple round-trips (`/api/groups`, `/api/subgroups`, and `/api/entries`).

The response is structured as a notebook envelope with paginated collections for each level. Nested collections surface pagination hooks and `next` URLs that target the same endpoint with scoped parameters, so clients can fetch additional slices without falling back to the legacy endpoints.

## Query Parameters

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `groups.take` | integer | 20 | Page size for top-level groups (1-100). |
| `groups.skip` | integer | — | Offset for classic pagination. Mutually exclusive with `groups.cursor`. |
| `groups.cursor` | string | — | Cursor returned from a previous page. Mutually exclusive with `groups.skip`. |
| `include` | comma-delimited string | — | Nested resources to include. Supports `subgroups` and `entries`. Selecting `entries` implies `subgroups`. |
| `subgroups.for` | comma-delimited string | — | Limits subgroup prefetching to specific group ids. When omitted, subgroups are hydrated for all groups in the current page. |
| `subgroups.take` | integer | 10 | Page size for each subgroup collection (1-50). Applied per group. |
| `subgroups.cursor` | comma-delimited key:value pairs | — | Cursors for subgroup pagination. Each entry uses the format `{groupId}:{cursor}`. |
| `entries.for` | comma-delimited string | — | Limits entry prefetching to specific subgroup ids. Defaults to all subgroups returned in the response. Requires `include=entries`. |
| `entries.take` | integer | 20 | Page size for each entry collection (1-100). Applied per subgroup. |
| `entries.cursor` | comma-delimited key:value pairs | — | Cursors for entry pagination using `{subgroupId}:{cursor}` format. |
| `entries.includeArchived` | boolean | `false` | When `true`, archived entries are included in entry collections and pagination metadata. |

Invalid pagination combinations (e.g., mixing skip and cursor) produce a `400` response consistent with the shared pagination helpers.

## Response

```jsonc
{
  "notebook": {
    "id": "nb1",
    "title": "Field Notes",
    "description": "Research notebook",
    "user_notebook_tree": ["Group", "Subgroup", "Entry"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-03T12:00:00.000Z"
  },
  "groups": {
    "data": [
      {
        "id": "g1",
        "name": "Research",
        "description": "Primary backlog",
        "user_sort": 0,
        "notebookId": "nb1",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-02T00:00:00.000Z",
        "subgroups": {
          "data": [
            {
              "id": "sg1",
              "name": "Articles",
              "description": null,
              "user_sort": 0,
              "groupId": "g1",
              "createdAt": "2024-01-01T00:00:00.000Z",
              "updatedAt": "2024-01-02T00:00:00.000Z",
              "entries": {
                "data": [
                  {
                    "id": "e1",
                    "title": "Protein research",
                    "content": "<p>Findings…</p>",
                    "status": "none",
                    "archived": false,
                    "user_sort": 0,
                    "subgroupId": "sg1",
                    "createdAt": "2024-01-01T00:00:00.000Z",
                    "updatedAt": "2024-01-02T00:00:00.000Z",
                    "tags": [
                      { "id": "t1", "name": "Biology", "code": "bio" }
                    ]
                  }
                ],
                "meta": {
                  "take": 20,
                  "count": 1,
                  "total": 4,
                  "hasMore": true,
                  "includeArchived": false,
                  "cursor": null,
                  "nextCursor": "e2",
                  "links": {
                    "next": "/api/notebooks/nb1/tree?include=entries&entries.for=sg1&entries.take=20&entries.cursor=sg1:e2&entries.includeArchived=false"
                  }
                }
              }
            }
          ],
          "meta": {
            "take": 10,
            "count": 1,
            "total": 3,
            "hasMore": true,
            "cursor": null,
            "nextCursor": "sg2",
            "links": {
              "next": "/api/notebooks/nb1/tree?include=subgroups&subgroups.for=g1&subgroups.take=10&subgroups.cursor=g1:sg2"
            }
          }
        }
      }
    ],
    "meta": {
      "take": 20,
      "count": 1,
      "total": 8,
      "hasMore": true,
      "cursor": null,
      "nextCursor": "g2",
      "links": {
        "next": "/api/notebooks/nb1/tree?groups.take=20&groups.cursor=g2&include=subgroups,entries"
      }
    }
  }
}
```

### Notebook payload

The notebook envelope always includes the immutable notebook metadata so the client no longer needs to query `/api/notebooks/{id}` before rendering the tree.

### Group objects

Group records mirror the `GET /api/groups` projection. When `include=subgroups` is provided the `subgroups` key appears with its own `{ data, meta }` structure. Pagination metadata is normalized across levels (take, count, total, cursor, nextCursor, hasMore) and `links.next` points back to this endpoint with the parameters needed to fetch the next slice for the current group.

### Subgroup objects

Subgroup records match the default `GET /api/subgroups` selection. When `include=entries` is active each subgroup gains an `entries` object with `{ data, meta }`. Entry pagination metadata contains `includeArchived` to help clients preserve filters when requesting the next slice.

If `include=entries` is omitted, `subgroups.meta` is still returned (with empty `data`) so the client can render pagination controls without making a secondary request.

### Entry objects

Entries are returned without the nested `subgroup`/`group` fan-out that `/api/entries` provides by default. Only the direct entry fields plus lightweight tag projections are included to minimize payload size. Clients can re-use the tree endpoint with targeted parameters whenever they need more entry pages or archived slices.

## Error responses

* `400` – Invalid pagination or projection options (mirrors shared helper errors).
* `401` – Missing or invalid session.
* `404` – Notebook not found or not owned by the requester.
* `405` – Methods other than `GET` are rejected with an `Allow: GET` header.
* `500` – Unexpected server error with a logged stack trace. A schema mismatch (e.g., missing `archived` column) surfaces the same migration hint as the legacy route.

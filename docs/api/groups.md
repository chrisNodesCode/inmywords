# Groups API

The `GET /api/groups` endpoint lists groups for a notebook owned by the authenticated user. Results are paginated and returned in the shared `PaginatedResponse<Group>` envelope described in [`src/api/types.js`](../../src/api/types.js).

## Query Parameters

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `notebookId` | string | **required** | Notebook to load groups from. |
| `take` | integer | 50 | Maximum number of records to return (1-100). |
| `skip` | integer | — | Offset for classic pagination. Cannot be combined with `cursor`. |
| `cursor` | string | — | Cursor returned from a previous page. Cannot be combined with `skip`. |
| `select` | comma-delimited string | — | Whitelist of group fields to return (always includes `id`). |
| `include` | comma-delimited string | — | Related records to include. Supports `subgroups`. |

## Response

```json
{
  "data": [
    {
      "id": "g1",
      "name": "Research",
      "description": "Primary research backlog",
      "user_sort": 0,
      "notebookId": "nb1",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-05T12:34:00.000Z"
    }
  ],
  "meta": {
    "take": 50,
    "count": 1,
    "total": 8,
    "hasMore": true,
    "nextCursor": "g2"
  }
}
```

When `include=subgroups` is provided, each group contains a `subgroups` array with subgroup records limited to `id`, `name`, `description`, `user_sort`, `groupId`, `createdAt`, and `updatedAt`.

### Example

```http
GET /api/groups?notebookId=nb1&take=10&cursor=g2 HTTP/1.1
Authorization: Bearer …
```

```json
{
  "data": [
    {
      "id": "g3",
      "name": "Archive",
      "description": null,
      "user_sort": 2,
      "notebookId": "nb1",
      "createdAt": "2024-01-02T00:00:00.000Z",
      "updatedAt": "2024-01-03T00:00:00.000Z"
    }
  ],
  "meta": {
    "take": 10,
    "count": 1,
    "total": 8,
    "hasMore": false
  }
}
```

# Entries API

The `GET /api/entries` endpoint returns a paginated list of entries for the authenticated user. Results are constrained to the calling user and can be filtered to a notebook, group, or subgroup.

## Query Parameters

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `take` | integer | 20 | Maximum number of records to return (1-100). |
| `skip` | integer | — | Offset to apply for classic pagination. Cannot be used with `cursor`. |
| `cursor` | string | — | Cursor identifier returned from a previous page. Cannot be used with `skip`. |
| `notebookId` | string | — | Filter entries by notebook. Mutually exclusive with `groupId` and `subgroupId`. |
| `groupId` | string | — | Filter entries by group. Mutually exclusive with `subgroupId`. |
| `subgroupId` | string | — | Filter entries by subgroup. |
| `status` | string | — | Filter by entry status (`none`, `draft`, etc.). |
| `select` | comma-delimited string | — | Whitelist of entry fields to return. Always includes `id`. |
| `include` | comma-delimited string | `tags,subgroup` | Related records to include. Supports `tags` and `subgroup`. |

Invalid combinations or values result in a `400` response with a validation message.

## Response

The endpoint returns a `PaginatedResponse<Entry>` (see [`src/api/types.js`](../../src/api/types.js)) with the following shape:

```json
{
  "data": [
    {
      "id": "e1",
      "title": "Entry 1",
      "content": "...",
      "status": "none",
      "archived": false,
      "user_sort": 0,
      "subgroupId": "sg1",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "tags": [
        { "id": "t1", "name": "Important", "code": "important" }
      ],
      "subgroup": {
        "id": "sg1",
        "name": "Backlog",
        "groupId": "g1",
        "group": {
          "id": "g1",
          "name": "Research",
          "notebookId": "nb1"
        }
      }
    }
  ],
  "meta": {
    "take": 20,
    "count": 1,
    "total": 42,
    "hasMore": true,
    "nextCursor": "e2"
  }
}
```

### Example

```http
GET /api/entries?subgroupId=sg1&take=10&include=tags HTTP/1.1
Authorization: Bearer …
```

```json
{
  "data": [
    {
      "id": "e1",
      "title": "Research outline",
      "status": "draft",
      "archived": false,
      "user_sort": 0,
      "subgroupId": "sg1",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:05:00.000Z",
      "tags": [
        { "id": "t1", "name": "Milestone", "code": "milestone" }
      ]
    }
  ],
  "meta": {
    "take": 10,
    "count": 1,
    "total": 7,
    "hasMore": false
  }
}
```

Use the `nextCursor` from the response to request the next page:

```http
GET /api/entries?subgroupId=sg1&take=10&cursor=e2 HTTP/1.1
```

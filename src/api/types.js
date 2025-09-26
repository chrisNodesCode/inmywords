/**
 * @typedef {Object} PaginationMeta
 * @property {number} take - The requested number of records per page.
 * @property {number} count - The number of records returned in this page.
 * @property {number} total - The total number of records that match the query filters.
 * @property {boolean} hasMore - Indicates whether another page of data is available.
 * @property {number} [skip] - The offset that was applied when using offset-based pagination.
 * @property {string} [cursor] - The cursor that was supplied by the caller, if any.
 * @property {string} [nextCursor] - The opaque cursor for retrieving the next page of results.
 */

/**
 * @template T
 * @typedef {Object} PaginatedResponse
 * @property {T[]} data - The page of records requested by the client.
 * @property {PaginationMeta} meta - Pagination metadata describing the slice of results.
 */

export const ApiTypes = {};

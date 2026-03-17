import mongoose from "mongoose";

/**
 * Build a MongoDB $match-compatible filter object from query params.
 * Only includes fields present in the query AND in the allowedFields whitelist.
 *
 * @param {Object} query - req.query object
 * @param {string[]} allowedFields - Field names to include
 * @param {Object} [typeMap] - Optional map of { fieldName: 'objectid'|'number'|'boolean'|'string' }
 * @returns {Object} MongoDB filter
 */
export function buildAnalyticsMatch(query, allowedFields, typeMap = {}) {
  const objectIdFields = new Set([
    "department", "student", "faculty", "section",
    "uploadedBy", "enteredBy"
  ]);

  const filter = {};

  for (const field of allowedFields) {
    const value = query[field];
    if (value === undefined || value === null || value === "") continue;

    const type = typeMap[field] || (objectIdFields.has(field) ? "objectid" : "string");

    switch (type) {
      case "objectid":
        if (!mongoose.Types.ObjectId.isValid(value)) continue; // skip invalid ids
        filter[field] = new mongoose.Types.ObjectId(value);
        break;
      case "number":
        filter[field] = Number(value);
        break;
      case "boolean":
        filter[field] = value === "true";
        break;
      default:
        filter[field] = value;
    }
  }

  return filter;
}

/**
 * Parse pagination and sorting params from query.
 *
 * @param {Object} query - req.query object
 * @param {string} [defaultSortBy] - Default sort field
 * @param {string[]} [allowedSortFields] - Whitelist for sortBy
 * @returns {{ page: number, limit: number, skip: number, sortStage: Object }}
 */
export function parsePagination(query, defaultSortBy = "_id", allowedSortFields = []) {
  let page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const orderVal = query.order === "asc" ? 1 : -1;
  let sortField = defaultSortBy;

  if (query.sortBy && (allowedSortFields.length === 0 || allowedSortFields.includes(query.sortBy))) {
    sortField = query.sortBy;
  }

  return { page, limit, skip, sortStage: { [sortField]: orderVal } };
}

/**
 * Wrap paginated aggregation response.
 */
export function paginatedResponse(data, totalCount, page, limit) {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  };
}

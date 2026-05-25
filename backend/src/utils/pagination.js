const SAFE_SORT_RE = /^-?[a-zA-Z_]{1,40}$/;

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 200);
  const skip = (page - 1) * limit;
  const rawSort = query.sort || '-createdAt';
  const sort = SAFE_SORT_RE.test(rawSort) ? rawSort : '-createdAt';
  return { page, limit, skip, sort };
}

async function paginate(Model, filter = {}, query = {}, options = {}) {
  const { page, limit, skip, sort } = parsePagination(query);
  const projection = options.projection;
  const populate = options.populate;

  let cursor = Model.find(filter, projection).sort(sort).skip(skip).limit(limit);
  if (populate) cursor = cursor.populate(populate);

  const [items, total] = await Promise.all([cursor.lean(), Model.countDocuments(filter)]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { parsePagination, paginate, escapeRegex };

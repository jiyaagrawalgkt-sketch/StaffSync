export const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, ...(message ? { message } : {}), data });

export const paginated = (res, items, total, { page, limit }) =>
  res.json({
    success: true,
    data: items,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });

export const pageParams = (q) => {
  const page = q.page || 1;
  const limit = q.limit || 10;
  return { page, limit, skip: (page - 1) * limit };
};

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

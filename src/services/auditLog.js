import AuditLog from '../models/AuditLog.js';

/**
 * Log an action to the audit trail.
 */
export async function logAction({ userId, action, entityType, entityId, before, after }) {
  const log = new AuditLog({
    userId,
    action,
    entityType,
    entityId,
    before: before || null,
    after: after || null,
    at: new Date(),
  });
  await log.save();
  return log;
}

/**
 * Get paginated audit log entries.
 */
export async function getAuditLog({ page = 1, limit = 50, entityType, action, userId }) {
  const filter = {};
  if (entityType) filter.entityType = entityType;
  if (action) filter.action = action;
  if (userId) filter.userId = userId;

  const total = await AuditLog.countDocuments(filter);
  const entries = await AuditLog.find(filter)
    .sort({ at: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('userId', 'name email');

  return {
    entries,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

import { getAuditLog } from '../services/auditLog.js';

/**
 * Get paginated audit log entries.
 */
export async function listAuditLog(req, res) {
  const { entityType, action, userId, page = 1, limit = 50 } = req.query;

  const result = await getAuditLog({
    page: parseInt(page),
    limit: parseInt(limit),
    entityType,
    action,
    userId,
  });

  res.json(result);
}

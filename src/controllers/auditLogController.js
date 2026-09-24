import { getAuditLog } from '../services/auditLog.js';
import AuditLog from '../models/AuditLog.js';

export async function auditFilters(_req, res) {
  const [entityTypes, actions] = await Promise.all([
    AuditLog.distinct('entityType'), AuditLog.distinct('action'),
  ]);
  res.json({ entityTypes: entityTypes.sort(), actions: actions.sort() });
}

/**
 * Get paginated audit log entries.
 */
export async function listAuditLog(req, res) {
  const { entityType, action, userId, page = 1, limit = 50 } = req.query;
  if (!/^\d+$/.test(String(page)) || !/^\d+$/.test(String(limit)) ||
      !Number.isSafeInteger(Number(page)) || Number(page) < 1 || Number(limit) < 1 || Number(limit) > 100) {
    return res.status(400).json({ error: 'page must be a positive integer; limit must be between 1 and 100' });
  }
  if ([entityType, action, userId].some(value => value !== undefined && typeof value !== 'string')) {
    return res.status(400).json({ error: 'Filters must be strings' });
  }
  if (userId && !/^[a-f\d]{24}$/i.test(userId)) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  const result = await getAuditLog({
    page: parseInt(page),
    limit: parseInt(limit),
    entityType,
    action,
    userId,
  });

  res.json(result);
}

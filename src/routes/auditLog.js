import { Router } from 'express';
import { listAuditLog, auditFilters } from '../controllers/auditLogController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', auth, listAuditLog);
router.get('/filters', auth, auditFilters);

export default router;

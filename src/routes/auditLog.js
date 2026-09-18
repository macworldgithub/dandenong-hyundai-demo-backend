import { Router } from 'express';
import { listAuditLog } from '../controllers/auditLogController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', auth, listAuditLog);

export default router;

import { Router } from 'express';
import authRoutes from './auth.js';
import entityRoutes from './entity.js';
import dashboardRoutes from './dashboard.js';
import bankRoutes from './bank.js';
import apRoutes from './ap.js';
import inventoryRoutes from './inventory.js';
import glRoutes from './gl.js';
import auditLogRoutes from './auditLog.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/entity', entityRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/bank', bankRoutes);
router.use('/ap', apRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/gl', glRoutes);
router.use('/audit-log', auditLogRoutes);

export default router;

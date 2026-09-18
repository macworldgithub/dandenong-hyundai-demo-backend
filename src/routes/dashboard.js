import { Router } from 'express';
import { getKPIs, drillKPIEndpoint } from '../controllers/dashboardController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/kpis', auth, getKPIs);
router.get('/kpis/:key/drill', auth, drillKPIEndpoint);

export default router;

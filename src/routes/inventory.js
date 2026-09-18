import atomic from '../middleware/atomic.js';
import { Router } from 'express';
import {
  listVehicles,
  getVehicle,
  addVehicleCostLine,
  listDeals,
  getDeal,
  listFloorplan,
  accrueInterest,
} from '../controllers/inventoryController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/vehicles', auth, listVehicles);
router.get('/vehicles/:id', auth, getVehicle);
router.post('/vehicles/:id/cost-lines', auth, atomic(addVehicleCostLine));

router.get('/deals', auth, listDeals);
router.get('/deals/:id', auth, getDeal);

router.get('/floorplan', auth, listFloorplan);
router.post('/floorplan/accrue-interest', auth, atomic(accrueInterest));

export default router;

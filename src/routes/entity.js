import { Router } from 'express';
import { getEntity } from '../controllers/entityController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', auth, getEntity);

export default router;

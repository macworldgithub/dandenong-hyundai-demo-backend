import atomic from '../middleware/atomic.js';
import { Router } from 'express';
import {
  getBankAccounts,
  importStatement,
  getTransactions,
  suggestMatchesEndpoint,
  allocateTransaction,
  splitTransaction,
  parkTransaction,
  unmatchTransaction,
  buildRecPackEndpoint,
  exportRecPack,
} from '../controllers/bankController.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/accounts', auth, getBankAccounts);
router.post('/statements/import', auth, upload.single('file'), atomic(importStatement));
router.get('/transactions', auth, getTransactions);
router.get('/transactions/:id/matches', auth, suggestMatchesEndpoint);
router.post('/transactions/:id/allocate', auth, atomic(allocateTransaction));
router.post('/transactions/:id/split', auth, atomic(splitTransaction));
router.post('/transactions/:id/park', auth, atomic(parkTransaction));
router.post('/transactions/:id/unmatch', auth, atomic(unmatchTransaction));
router.post('/rec-pack', auth, buildRecPackEndpoint);
router.get('/rec-pack/:id', auth, exportRecPack);

export default router;

import atomic from '../middleware/atomic.js';
import { Router } from 'express';
import {
  getTrialBalance,
  getAccounts,
  drillAccountEndpoint,
  listJournals,
  getJournal,
  postManualJournal,
  reverseJournal,
  getControlRecs,
  buildSingleControlRec,
  completeControlRecEndpoint,
  exportEvidencePack,
} from '../controllers/glController.js';
import auth from '../middleware/auth.js';
import glDemo from '../middleware/glDemo.js';

const router = Router();
router.use(auth, glDemo);

router.get('/trial-balance', auth, getTrialBalance);
router.get('/accounts', auth, getAccounts);
router.get('/accounts/:id/drill', auth, drillAccountEndpoint);

router.get('/journals', auth, listJournals);
router.get('/journals/:id', auth, getJournal);
router.post('/journals', auth, atomic(postManualJournal));
router.post('/journals/:id/reverse', auth, atomic(reverseJournal));

router.get('/control-recs', auth, getControlRecs);
router.post('/control-recs/:type', auth, buildSingleControlRec);
router.post('/control-recs/:type/complete', auth, atomic(completeControlRecEndpoint));

router.get('/evidence-pack', auth, exportEvidencePack);

export default router;

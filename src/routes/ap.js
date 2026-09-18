import atomic from '../middleware/atomic.js';
import { Router } from 'express';
import {
  uploadInvoice,
  exportPaymentRun,
  getInvoiceDocument,
  listInvoices,
  getInvoice,
  updateExtraction,
  codeInvoice,
  threeWayMatch,
  resolveException,
  approveInvoice,
  createPaymentRun,
  approvePaymentRun,
  listPaymentRuns,
  getAgeing,
  listSuppliers,
} from '../controllers/apController.js';
import { requireRole } from '../middleware/auth.js';
import auth from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/invoices', auth, listInvoices);
router.get('/invoices/:id', auth, getInvoice);
router.post('/invoices/upload', auth, upload.single('file'), atomic(uploadInvoice));
router.patch('/invoices/:id/extraction', auth, atomic(updateExtraction));
router.post('/invoices/:id/code', auth, atomic(codeInvoice));
router.post('/invoices/:id/match', auth, atomic(threeWayMatch));
router.post('/invoices/:id/resolve', auth, atomic(resolveException));
router.post('/invoices/:id/approve', auth, requireRole('controller', 'accountant', 'admin'), atomic(approveInvoice));

router.get('/payment-runs', auth, listPaymentRuns);
router.post('/payment-runs', auth, atomic(createPaymentRun));
router.post('/payment-runs/:id/approve', auth, requireRole('controller', 'accountant', 'admin'), atomic(approvePaymentRun));

router.get('/ageing', auth, getAgeing);
router.get('/invoices/:id/document', auth, getInvoiceDocument);
router.get('/payment-runs/:id/export', auth, exportPaymentRun);

router.get('/suppliers', auth, listSuppliers);

export default router;

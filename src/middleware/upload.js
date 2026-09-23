import multer from 'multer';
import path from 'path';
import fs from 'fs';
import env from '../config/env.js';

const uploadDir = process.env.VERCEL
  ? path.join('/tmp', path.basename(env.UPLOAD_DIR || 'uploads'))
  : path.resolve(env.UPLOAD_DIR);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
    'application/octet-stream',
  ];
  if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls|pdf|ofx)$/i)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

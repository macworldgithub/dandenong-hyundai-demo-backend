import crypto from 'crypto';

/**
 * Generate a short uppercase alphanumeric ID for human-readable references.
 */
export function generateRef(prefix = '', length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 to avoid confusion
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a deal number in DH-YYMM-NNNN format.
 */
export function generateDealNumber(seq) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `DH-${yy}${mm}-${String(seq).padStart(4, '0')}`;
}

/**
 * Generate a UUID v4.
 */
export function uuid() {
  return crypto.randomUUID();
}

/**
 * Money utilities — all values stored as integers in cents.
 * Never use JS floats for money.
 */

/**
 * Convert a dollar amount (number or string) to cents.
 * Rounds to nearest integer to handle floating-point dust.
 */
export function toCents(dollars) {
  if (dollars === null || dollars === undefined) return 0;
  const n = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  return Math.round(n * 100);
}

/**
 * Convert cents to dollars (for display only — never store the result).
 */
export function fromCents(cents) {
  if (cents === null || cents === undefined) return 0;
  return cents / 100;
}

/**
 * Sum an array of cent values. Returns an exact integer.
 */
export function sumCents(values) {
  let total = 0;
  for (const v of values) {
    total += v || 0;
  }
  return total;
}

/**
 * Format cents as AUD string, e.g. "$1,234.56" or "($1,234.56)" for negatives.
 */
export function formatAUD(cents) {
  if (cents === null || cents === undefined) return '$0.00';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const formatted = `$${dollars.toLocaleString('en-AU')}.${String(remainder).padStart(2, '0')}`;
  return cents < 0 ? `(${formatted})` : formatted;
}

/**
 * Assert that a cents value equals zero. Throws if not.
 */
export function assertBalanced(value, label = 'Balance check') {
  if (value !== 0) {
    throw new Error(`${label}: expected 0, got ${value} cents (${formatAUD(value)})`);
  }
}

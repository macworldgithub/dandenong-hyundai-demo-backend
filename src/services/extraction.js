import fs from 'node:fs/promises';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { parseDate } from '../utils/csv.js';

// Read text embedded in the supplied PDF. Scans remain reviewable captures;
// missing values are explicitly identified, never fabricated as extracted data.
export async function extractInvoice(filePath) {
  const buffer = await fs.readFile(filePath);
  if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw Object.assign(new Error('Upload a valid PDF invoice'), { statusCode: 422 });
  }
  let text;
  try { text = (await pdf(buffer)).text; }
  catch { throw Object.assign(new Error('The PDF could not be read. Check that it is a valid, unencrypted document.'), { statusCode: 422 }); }
  const find = pattern => text.match(pattern)?.[1]?.trim();
  const money = label => {
    const value = find(new RegExp('(?:^|\\n)\\s*(?:' + label + ')\\s*:?\\s*(?:AUD\\s*)?\\$?\\s*([\\d,]+\\.\\d{2})', 'i'));
    return value === undefined ? undefined : Math.round(Number(value.replaceAll(',', '')) * 100);
  };
  const date = label => {
    const value = find(new RegExp('(?:' + label + ')\\s*:?\\s*(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{4})', 'i'));
    return value ? parseDate(value) : undefined;
  };
  const extractedData = {
    invoiceNumber: find(/invoice\s*(?:number|no\.?|#)\s*:?\s*([^\s]+)/i),
    invoiceDate: date('invoice date|date'), dueDate: date('due date'),
    subtotalCents: money('subtotal|sub total|total excl(?:uding)?\\.? GST'),
    gstCents: money('GST(?:\\s*\\(10%\\))?|tax'),
    grossCents: money('grand total|total incl(?:uding)?\\.? GST|amount due|total'),
    abn: find(/ABN\s*:?\s*([\d ]{11,14})/i),
  };
  const fields = Object.entries(extractedData).filter(([,v]) => v !== undefined)
    .map(([name,value]) => ({ name, value: value instanceof Date ? value.toISOString().slice(0,10) : String(value), confidence: 0.85 }));
  const required = ['invoiceNumber', 'invoiceDate', 'dueDate', 'subtotalCents', 'gstCents', 'grossCents'];
  const estimatedFields = required.filter(key => extractedData[key] === undefined);
  return { text, extractedData, fields, estimatedFields, confidence: estimatedFields.length ? 0 : 0.85 };
}

import PaymentRun from '../models/PaymentRun.js';
import Account from '../models/Account.js';
import BankTransaction from '../models/BankTransaction.js';
import ApInvoice from '../models/ApInvoice.js';
import DealJacket from '../models/DealJacket.js';
import FloorplanDraw from '../models/FloorplanDraw.js';
import Supplier from '../models/Supplier.js';

/**
 * Matching engine — scores bank transactions against open items.
 *
 * Candidate sources:
 * - Open AP invoices (payments going out)
 * - Deal deposits / balance-of-deal (customer payments coming in)
 * - Financier settlements (floorplan settlements, OEM bonus)
 * - OEM bonus receipts
 *
 * Scoring factors:
 * - Amount proximity (±5% tolerance with diminishing score)
 * - Date window (within 7 days is ideal, up to 30 days considered)
 * - Description token matching (supplier name, invoice number, VIN, deal number)
 *
 * Confidence 0–1: ≥0.9 auto-suggested, <0.9 manual review
 */

/**
 * Score a bank transaction against all candidate matches.
 * @param {string} transactionId
 * @returns {Promise<Array<{type, id, description, amountCents, confidence, matchDetails}>>}
 */
export async function suggestMatches(transactionId) {
  const txn = await BankTransaction.findById(transactionId);
  if (!txn) throw Object.assign(new Error('Transaction not found'), { statusCode: 404 });

  const absAmount = Math.abs(txn.amountCents);
  const txnDate = txn.date;
  const descTokens = tokenize(txn.description);
  const candidates = [];

  // 1. AP Invoices (match against outgoing payments)
  if (txn.direction === 'debit' || txn.amountCents < 0) {
    const invoices = await ApInvoice.find({
      status: 'approved', paidInRunId: null,
    }).populate('supplierId', 'name');

    for (const inv of invoices) {
      const score = computeScore(
        absAmount,
        inv.grossCents,
        txnDate,
        inv.invoiceDate,
        descTokens,
        [
          inv.supplierId?.name,
          inv.invoiceNumber,
          inv.vin,
        ].filter(Boolean)
      );

      if (score > 0.3) {
        candidates.push({
          type: 'ap_invoice',
          id: inv._id,
          description: `${inv.supplierId?.name || 'Supplier'} - INV#${inv.invoiceNumber}`,
          amountCents: inv.grossCents,
          confidence: score,
          matchDetails: {
            invoiceId: inv._id, supplierId: inv.supplierId?._id, accountId: (await Account.findOne({ controlFor: 'ap' }))?._id,
            supplierName: inv.supplierId?.name,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            vin: inv.vin,
          },
        });
      }
    }
  }

  if (txn.amountCents < 0) {
    const runs = await PaymentRun.find({ status: 'paid', bankAccountId: txn.bankAccountId, totalCents: absAmount });
    for (const run of runs) {
      if (await BankTransaction.exists({ 'allocations.paymentRunId': run._id, status: 'matched' })) continue;
      candidates.push({ type: 'payment_run', id: run._id, description: `Supplier payment run ${run.abaFileRef}`, amountCents: run.totalCents, confidence: .95, matchDetails: { paymentRunId: run._id, accountId: (await Account.findOne({ controlFor: 'ap' }))?._id } });
    }
  }

  // 2. Deal deposits (match against incoming payments)
  if (txn.direction === 'credit' || txn.amountCents > 0) {
    const deals = await DealJacket.find().populate('vehicleId', 'vin stockNumber model');

    for (const deal of deals) {
      // Match against selling price + GST or balance-of-deal amounts
      const dealAmount = deal.sellingPriceCents + deal.gstCents -
        deal.tradeAllowanceCents + deal.payoffCents;

      const score = computeScore(
        absAmount,
        Math.abs(dealAmount),
        txnDate,
        deal.deliveryDate,
        descTokens,
        [
          deal.dealNumber,
          deal.vehicleId?.vin,
          deal.vehicleId?.stockNumber,
          deal.customerRef,
        ].filter(Boolean)
      );

      if (score > 0.3) {
        candidates.push({
          type: 'deal_deposit',
          id: deal._id,
          description: `Deal ${deal.dealNumber} - ${deal.vehicleId?.model || 'Vehicle'}`,
          amountCents: dealAmount,
          confidence: score,
          matchDetails: {
            dealNumber: deal.dealNumber,
            vin: deal.vehicleId?.vin,
            stockNumber: deal.vehicleId?.stockNumber,
          },
        });
      }
    }
  }

  // 3. Financier settlements (incoming — floorplan payoffs)
  if (txn.direction === 'credit' || txn.amountCents > 0) {
    const draws = await FloorplanDraw.find({
      settledDate: { $ne: null },
    }).populate('vehicleId', 'vin stockNumber model');

    for (const draw of draws) {
      const settlementAmount = draw.drawnAmountCents;

      const score = computeScore(
        absAmount,
        settlementAmount,
        txnDate,
        draw.settledDate,
        descTokens,
        [draw.financier, draw.vehicleId?.vin, 'floorplan', 'settlement'].filter(Boolean)
      );

      if (score > 0.3) {
        candidates.push({
          type: 'financier_settlement',
          id: draw._id,
          description: `${draw.financier} settlement - ${draw.vehicleId?.vin || 'VIN'}`,
          amountCents: settlementAmount,
          confidence: score,
          matchDetails: {
            financier: draw.financier,
            vin: draw.vehicleId?.vin,
            drawnDate: draw.drawnDate,
          },
        });
      }
    }
  }

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  // Update transaction with top match suggestion
  if (candidates.length > 0 && !txn.journalEntryId && ['unmatched', 'suggested'].includes(txn.status)) {
    const topMatch = candidates[0];
    txn.matchConfidence = topMatch.confidence;
    txn.matchType = topMatch.type;
    if (topMatch.confidence >= 0.9) {
      txn.status = 'suggested';
    }
    await txn.save();
  }

  return candidates;
}

/**
 * Compute a match score between 0 and 1.
 */
function computeScore(txnAmount, candidateAmount, txnDate, candidateDate, txnTokens, candidateTokens) {
  let score = 0;

  // Amount proximity (40% weight)
  const amountDiff = Math.abs(txnAmount - candidateAmount);
  const tolerance = candidateAmount * 0.05; // 5% tolerance
  if (amountDiff === 0) {
    score += 0.4; // exact match
  } else if (amountDiff <= tolerance) {
    score += 0.4 * (1 - amountDiff / tolerance);
  } else if (amountDiff <= candidateAmount * 0.2) {
    score += 0.1 * (1 - amountDiff / (candidateAmount * 0.2));
  }

  // Date proximity (25% weight)
  if (txnDate && candidateDate) {
    const daysDiff = Math.abs(
      (new Date(txnDate).getTime() - new Date(candidateDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysDiff <= 3) {
      score += 0.25;
    } else if (daysDiff <= 7) {
      score += 0.25 * (1 - (daysDiff - 3) / 4);
    } else if (daysDiff <= 30) {
      score += 0.05 * (1 - (daysDiff - 7) / 23);
    }
  }

  // Description token matching (35% weight)
  if (txnTokens.length > 0 && candidateTokens.length > 0) {
    const candidateTokensLower = candidateTokens.map((t) => t.toLowerCase());
    let tokenMatches = 0;
    for (const token of txnTokens) {
      for (const cToken of candidateTokensLower) {
        if (cToken.includes(token) || token.includes(cToken)) {
          tokenMatches++;
          break;
        }
      }
    }
    const tokenScore = tokenMatches / Math.max(txnTokens.length, candidateTokensLower.length);
    score += 0.35 * tokenScore;
  }

  return Math.min(score, 1);
}

/**
 * Tokenize a description string into searchable tokens.
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Run the matching engine across all unmatched transactions.
 */
export async function runBulkMatching(bankAccountId) {
  const unmatched = await BankTransaction.find({
    bankAccountId,
    status: 'unmatched',
  });

  const results = { suggested: 0, unmatched: 0 };

  for (const txn of unmatched) {
    const candidates = await suggestMatches(txn._id);
    if (candidates.length > 0 && candidates[0].confidence >= 0.9) {
      results.suggested++;
    } else {
      results.unmatched++;
    }
  }

  return results;
}

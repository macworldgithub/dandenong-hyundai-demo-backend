import Vehicle from '../models/Vehicle.js';
import FloorplanDraw from '../models/FloorplanDraw.js';
import Account from '../models/Account.js';
import { postJournalEntry } from './posting.js';
import { sumCents } from '../utils/money.js';

/**
 * Costing engine — manages VIN-level cost stacks.
 *
 * Responsibilities:
 * 1. Recompute totalCostCents from cost lines
 * 2. Holdback and bonus reduce cost (negative amounts)
 * 3. Accrue floorplan interest to the VIN
 * 4. Post matching journal so inventory control always equals sum of VIN costs
 */

/**
 * Recompute totalCostCents for a vehicle from its cost lines.
 */
export async function recomputeVehicleCost(vin) {
  const vehicle = await Vehicle.findOne({ vin });
  if (!vehicle) {
    throw Object.assign(new Error(`Vehicle not found: ${vin}`), { statusCode: 404 });
  }

  vehicle.totalCostCents = sumCents(vehicle.costLines.map((cl) => cl.amountCents));
  await vehicle.save();

  return vehicle;
}

/**
 * Add a cost line to a vehicle and recompute cost.
 * Posts a journal to keep inventory control in sync.
 */
export async function addCostLine(vin, costLine, periodId, userId) {
  const vehicle = await Vehicle.findOne({ vin });
  if (!vehicle) {
    throw Object.assign(new Error(`Vehicle not found: ${vin}`), { statusCode: 404 });
  }

  // Add the cost line
  vehicle.costLines.push({
    type: costLine.type,
    amountCents: costLine.amountCents,
    sourceDocRef: costLine.sourceDocRef,
    addedAt: new Date(),
  });

  // Recompute total
  vehicle.totalCostCents = sumCents(vehicle.costLines.map((cl) => cl.amountCents));
  await vehicle.save();

  // Determine the correct inventory control account
  const controlFor = `inventory_${vehicle.class}`;
  const inventoryAccount = await Account.findOne({ isControl: true, controlFor });
  if (!inventoryAccount) {
    throw new Error(`No inventory control account found for ${controlFor}`);
  }

  // Determine the expense/AP account based on cost line type
  let sourceAccount;
  if (costLine.type === 'recon') {
    sourceAccount = await Account.findOne({
      $or: [
        { name: { $regex: /recon/i } },
        { code: { $regex: /^5[0-9]{3}/ } }, // expense range
      ],
      type: { $in: ['expense', 'liability'] },
    });
  } else if (costLine.type === 'floorplan_interest') {
    sourceAccount = await Account.findOne({
      $or: [
        { name: { $regex: /floorplan.*interest/i } },
        { controlFor: 'floorplan' },
      ],
    });
  } else {
    // Default: credit AP or expense
    sourceAccount = await Account.findOne({
      isControl: true,
      controlFor: 'ap',
    });
  }

  if (!sourceAccount) {
    // Fallback to first expense account
    sourceAccount = await Account.findOne({ type: 'expense' });
  }

  // Post the journal entry
  const isDebitToInventory = costLine.amountCents > 0;
  const absAmount = Math.abs(costLine.amountCents);

  const lines = isDebitToInventory
    ? [
        { accountId: inventoryAccount._id, debitCents: absAmount, creditCents: 0, vin, department: vehicle.class === 'new' ? 'New' : 'Used' },
        { accountId: sourceAccount._id, debitCents: 0, creditCents: absAmount, vin, department: vehicle.class === 'new' ? 'New' : 'Used' },
      ]
    : [
        // Negative cost (holdback, bonus) — reverse the entry
        { accountId: sourceAccount._id, debitCents: absAmount, creditCents: 0, vin, department: vehicle.class === 'new' ? 'New' : 'Used' },
        { accountId: inventoryAccount._id, debitCents: 0, creditCents: absAmount, vin, department: vehicle.class === 'new' ? 'New' : 'Used' },
      ];

  const narration = `${costLine.type.replace(/_/g, ' ')} — ${vehicle.stockNumber} ${vehicle.model}`;

  const entry = await postJournalEntry(
    {
      periodId,
      date: new Date(),
      source: 'deal',
      sourceRef: costLine.sourceDocRef || vin,
      narration,
      lines,
      postedBy: userId,
    },
    { skipRevenueCheck: true }
  );

  return { vehicle, journalEntry: entry };
}

/**
 * Accrue floorplan interest to VINs.
 * Adds a floorplan_interest cost line and posts journal.
 */
export async function accrueFloorplanInterest(periodId, userId) {
  const draws = await FloorplanDraw.find({ settledDate: null });
  const results = [];

  for (const draw of draws) {
    if (draw.interestAccruedCents <= 0) continue;

    const vehicle = await Vehicle.findById(draw.vehicleId);
    if (!vehicle) continue;

    // Check if interest already accrued for this draw
    const alreadyAccrued = vehicle.costLines.some(
      (cl) =>
        cl.type === 'floorplan_interest' &&
        cl.sourceDocRef === `FP-${draw._id}`
    );
    if (alreadyAccrued) continue;

    const result = await addCostLine(
      vehicle.vin,
      {
        type: 'floorplan_interest',
        amountCents: draw.interestAccruedCents,
        sourceDocRef: `FP-${draw._id}`,
      },
      periodId,
      userId
    );

    results.push(result);
  }

  return results;
}

/**
 * Get the full cost stack for a vehicle including floorplan.
 */
export async function getVehicleCostStack(vin) {
  const vehicle = await Vehicle.findOne({ vin });
  if (!vehicle) {
    throw Object.assign(new Error(`Vehicle not found: ${vin}`), { statusCode: 404 });
  }

  const floorplan = await FloorplanDraw.find({ vehicleId: vehicle._id });

  return {
    vehicle,
    costLines: vehicle.costLines,
    totalCostCents: vehicle.totalCostCents,
    floorplan,
  };
}

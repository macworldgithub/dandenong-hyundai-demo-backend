import Vehicle from '../models/Vehicle.js';
import DealJacket from '../models/DealJacket.js';
import FloorplanDraw from '../models/FloorplanDraw.js';
import Entity from '../models/Entity.js';
import { recomputeVehicleCost, addCostLine, accrueFloorplanInterest, getVehicleCostStack } from '../services/costing.js';
import { logAction } from '../services/auditLog.js';
import { sumCents } from '../utils/money.js';

async function stockSummary() {
  const [summary] = await Vehicle.aggregate([
    { $match: { status: { $ne: 'delivered' } } },
    { $addFields: { age: { $ifNull: ['$ageDays', { $floor: { $divide: [{ $subtract: ['$$NOW', '$createdAt'] }, 86400000] } }] } } },
    { $facet: {
      totals: [{ $group: { _id: null, count: { $sum: 1 }, cost: { $sum: '$totalCostCents' }, over90: { $sum: { $cond: [{ $gt: ['$age', 90] }, 1, 0] } } } }],
      bands: [{ $bucket: { groupBy: '$age', boundaries: [0, 31, 61, 91, 121], default: 121, output: { count: { $sum: 1 }, cost: { $sum: '$totalCostCents' } } } }],
    } },
  ]);
  return { ...(summary?.totals[0] || { count: 0, cost: 0, over90: 0 }), bands: summary?.bands || [] };
}

export async function getInventoryStats(_req, res) {
  const [summary, entity, financiers] = await Promise.all([
    stockSummary(), Entity.findOne(),
    FloorplanDraw.aggregate([{ $match: { settledDate: null } }, { $group: { _id: '$financier', count: { $sum: 1 }, drawn: { $sum: '$drawnAmountCents' }, interest: { $sum: '$interestAccruedCents' } } }]),
  ]);
  const totalDrawnCents = sumCents(financiers.map(f => f.drawn));
  const facilityLimitCents = entity?.facilityLimitCents || 0;
  res.json({ summary, facility: { activeDraws: [], total: financiers.reduce((n, f) => n + f.count, 0), totalPages: 0,
    financiers, totalDrawnCents, totalInterestCents: sumCents(financiers.map(f => f.interest)),
    facilityLimitCents, headroomCents: facilityLimitCents - totalDrawnCents } });
}

/**
 * List vehicles (stock grid) with filtering and pagination.
 */
export async function listVehicles(req, res) {
  const { status, class: vehicleClass, q, page = 1, limit = 15 } = req.query;
  if (!Number.isSafeInteger(Number(page)) || Number(page) < 1 || !Number.isSafeInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100) return res.status(400).json({ error: 'Invalid pagination' });
  const filter = {};

  if (status) filter.status = status;
  if (vehicleClass) filter.class = vehicleClass;
  if (q) {
    filter.$or = [
      { vin: { $regex: q, $options: 'i' } },
      { stockNumber: { $regex: q, $options: 'i' } },
      { model: { $regex: q, $options: 'i' } },
      { make: { $regex: q, $options: 'i' } },
      { csvDescription: { $regex: q, $options: 'i' } },
      { registrationNumber: { $regex: q, $options: 'i' } },
      { colour: { $regex: q, $options: 'i' } },
      { location: { $regex: q, $options: 'i' } },
      { deal: { $regex: q, $options: 'i' } },
      { sourceStatus: { $regex: q, $options: 'i' } },
    ];
  }

  const total = await Vehicle.countDocuments(filter);
  const vehicles = await Vehicle.find(filter)
    .sort({ stockNumber: 1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const summary = await stockSummary();
  res.json({
    summary,
    vehicles,
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
  });
}

/**
 * Get a single vehicle (VIN card) with full cost stack.
 */
export async function getVehicle(req, res) {
  const { id } = req.params;
  // Support lookup by VIN or by MongoDB _id
  const vehicle = await Vehicle.findOne({
    $or: [{ vin: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined }].filter(o => Object.values(o)[0] !== undefined),
  });

  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const costStack = await getVehicleCostStack(vehicle.vin);
  const deal = await DealJacket.findOne({ vehicleId: vehicle._id });

  res.json({
    ...costStack,
    deal: deal || null,
  });
}

/**
 * Add a cost line to a vehicle.
 */
export async function addVehicleCostLine(req, res) {
  const { id } = req.params;
  const { type, amountCents, sourceDocRef } = req.body;

  if (!type || amountCents === undefined) {
    return res.status(422).json({ error: 'type and amountCents are required' });
  }

  const validTypes = ['invoice', 'transport', 'pdi', 'accessories', 'recon', 'duty', 'compliance', 'holdback', 'bonus', 'floorplan_interest'];
  if (!validTypes.includes(type)) {
    return res.status(422).json({ error: `Invalid cost type. Must be one of: ${validTypes.join(', ')}` });
  }

  // Find vehicle by VIN or _id
  const vehicle = await Vehicle.findOne({
    $or: [{ vin: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined }].filter(o => Object.values(o)[0] !== undefined),
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const entity = await Entity.findOne();
  const result = await addCostLine(
    vehicle.vin,
    { type, amountCents, sourceDocRef },
    entity.activePeriod,
    req.user._id
  );

  await logAction({
    userId: req.user._id,
    action: 'cost_line_added',
    entityType: 'Vehicle',
    entityId: vehicle._id,
    after: { type, amountCents, sourceDocRef, totalCostCents: result.vehicle.totalCostCents },
  });

  res.json(result);
}

/**
 * List deal jackets with pagination.
 */
export async function listDeals(req, res) {
  const { page = 1, limit = 15 } = req.query;
  if (!Number.isSafeInteger(Number(page)) || Number(page) < 1 || !Number.isSafeInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100) return res.status(400).json({ error: 'Invalid pagination' });

  const total = await DealJacket.countDocuments();
  const deals = await DealJacket.find()
    .sort({ deliveryDate: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .populate('vehicleId', 'vin stockNumber make model variant year class status');

  res.json({
    deals,
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
  });
}

/**
 * Get a single deal jacket with full detail.
 */
export async function getDeal(req, res) {
  const deal = await DealJacket.findById(req.params.id)
    .populate('vehicleId');

  if (!deal) return res.status(404).json({ error: 'Deal not found' });

  // Get the vehicle's cost stack
  let costStack = null;
  if (deal.vehicleId) {
    costStack = await getVehicleCostStack(deal.vehicleId.vin);
  }

  res.json({ deal, costStack });
}

/**
 * Get floorplan draws with pagination.
 */
export async function listFloorplan(req, res) {
  const { settled, page = 1, limit = 15 } = req.query;
  if (!Number.isSafeInteger(Number(page)) || Number(page) < 1 || !Number.isSafeInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100) return res.status(400).json({ error: 'Invalid pagination' });
  const filter = {};

  if (settled === 'true') filter.settledDate = { $ne: null };
  if (settled === 'false') filter.settledDate = null;

  const total = await FloorplanDraw.countDocuments(filter);
  const draws = await FloorplanDraw.find(filter)
    .sort({ drawnDate: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .populate('vehicleId', 'vin stockNumber model');

  const financiers = await FloorplanDraw.aggregate([{ $match: filter }, { $group: { _id: '$financier', count: { $sum: 1 }, drawn: { $sum: '$drawnAmountCents' }, interest: { $sum: '$interestAccruedCents' } } }]);
  const totalDrawnCents = sumCents(financiers.map(d => d.drawn));
  const totalInterestCents = sumCents(financiers.map(d => d.interest));
  const entity = await Entity.findOne();

  res.json({
    draws,
    financiers,
    facilityLimitCents: entity?.facilityLimitCents || 0,
    headroomCents: (entity?.facilityLimitCents || 0) - totalDrawnCents,
    totalDrawnCents,
    totalInterestCents,
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
  });
}

/**
 * Trigger floorplan interest accrual for the active period.
 */
export async function accrueInterest(req, res) {
  const entity = await Entity.findOne();
  const results = await accrueFloorplanInterest(entity.activePeriod, req.user._id);

  await logAction({
    userId: req.user._id,
    action: 'floorplan_interest_accrued',
    entityType: 'FloorplanDraw',
    after: { vinsAccrued: results.length },
  });

  res.json({
    accrued: results.length,
    results: results.map((r) => ({
      vin: r.vehicle.vin,
      totalCostCents: r.vehicle.totalCostCents,
    })),
  });
}

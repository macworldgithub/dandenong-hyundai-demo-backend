import Vehicle from '../models/Vehicle.js';
import DealJacket from '../models/DealJacket.js';
import FloorplanDraw from '../models/FloorplanDraw.js';
import Entity from '../models/Entity.js';
import { recomputeVehicleCost, addCostLine, accrueFloorplanInterest, getVehicleCostStack } from '../services/costing.js';
import { logAction } from '../services/auditLog.js';
import { sumCents } from '../utils/money.js';

/**
 * List vehicles (stock grid) with filtering and pagination.
 */
export async function listVehicles(req, res) {
  const { status, class: vehicleClass, q, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (vehicleClass) filter.class = vehicleClass;
  if (q) {
    filter.$or = [
      { vin: { $regex: q, $options: 'i' } },
      { stockNumber: { $regex: q, $options: 'i' } },
      { model: { $regex: q, $options: 'i' } },
      { make: { $regex: q, $options: 'i' } },
    ];
  }

  const total = await Vehicle.countDocuments(filter);
  const vehicles = await Vehicle.find(filter)
    .sort({ stockNumber: 1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  res.json({
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
  const { page = 1, limit = 50 } = req.query;

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
  const { settled, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (settled === 'true') filter.settledDate = { $ne: null };
  if (settled === 'false') filter.settledDate = null;

  const total = await FloorplanDraw.countDocuments(filter);
  const draws = await FloorplanDraw.find(filter)
    .sort({ drawnDate: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .populate('vehicleId', 'vin stockNumber model');

  const totalDrawnCents = sumCents(draws.map((d) => d.drawnAmountCents));
  const totalInterestCents = sumCents(draws.map((d) => d.interestAccruedCents));

  res.json({
    draws,
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

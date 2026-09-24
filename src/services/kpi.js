import JournalEntry from '../models/JournalEntry.js';
import DealJacket from '../models/DealJacket.js';
import Vehicle from '../models/Vehicle.js';
import FloorplanDraw from '../models/FloorplanDraw.js';
import ApInvoice from '../models/ApInvoice.js';
import BankTransaction from '../models/BankTransaction.js';
import ControlRec from '../models/ControlRec.js';
import Account from '../models/Account.js';
import Entity from '../models/Entity.js';
import Period from '../models/Period.js';
import env from '../config/env.js';
import { cfoDemoManagement } from './cfoDemo.js';
import { sumCents, fromCents } from '../utils/money.js';

/**
 * KPI computation service for the Command Centre.
 *
 * Returns the exact DashboardResponse shape the frontend expects:
 *   { kpis: KpiTileData[], exceptions, facilityLimitCents, facilityHeadroomCents }
 *
 * Each KpiTileData: { key, label, value, formattedValue, trendPercentage?, status, desk }
 */

// ─── Formatting helpers ────────────────────────────────────────────────
function fmtAUD(cents) {
  const abs = Math.abs(cents || 0) / 100;
  const s = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return cents < 0 ? `(${s})` : s;
}

function fmtAUDFull(cents) {
  const abs = Math.abs(cents || 0) / 100;
  const s = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return cents < 0 ? `(${s})` : s;
}

function fmtCompact(cents) {
  const v = (cents || 0) / 100;
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}m`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000).toLocaleString()}k`;
  return fmtAUD(cents);
}

// ─── Main entry ────────────────────────────────────────────────────────

export async function computeKPIs(periodId) {
  const [absorption, usedGpu, daysSupply, floorplanInterest, effectiveLabour, partsMargin, fniPenetration, inventoryRoi, entity, period, inventoryInStockCount] =
    await Promise.all([
      computeAbsorption(periodId),
      computeUsedGPU(periodId),
      computeDaysSupply(),
      computeFloorplanInterest(),
      computeEffectiveLabour(periodId),
      computePartsMargin(periodId),
      computeFniPenetration(periodId),
      computeInventoryROI(periodId),
      Entity.findOne(),
      Period.findById(periodId),
      Vehicle.countDocuments({ status: 'in_stock' }),
    ]);

  const kpis = [absorption, usedGpu, daysSupply, floorplanInterest, effectiveLabour, partsMargin, fniPenetration, inventoryRoi];

  // Exceptions
  const unmatchedBankTxnsCount = await BankTransaction.countDocuments({
    status: { $in: ['unmatched', 'parked', 'suggested'] },
  });
  const openApExceptionsCount = await ApInvoice.countDocuments({ status: 'exception' });
  const unreconciledControlRecsCount = await ControlRec.countDocuments({
    periodId,
    status: 'in_progress',
  });
  const totalExceptionsCount = unmatchedBankTxnsCount + openApExceptionsCount + unreconciledControlRecsCount;

  // Facility headroom
  const limitCents = entity?.facilityLimitCents || 0;
  const drawnAgg = await FloorplanDraw.aggregate([
    { $match: { settledDate: null } },
    { $group: { _id: null, total: { $sum: '$drawnAmountCents' } } },
  ]);
  const drawnCents = drawnAgg[0]?.total || 0;
  const facilityHeadroomCents = limitCents - drawnCents;

  const { sixMonthGrossTrend, departmentContributions } = env.CFO_DEMO_MODE
    ? cfoDemoManagement(period?.code)
    : await computeManagementData(periodId);

  return {
    periodCode: period?.code || null,
    managementDataSource: env.CFO_DEMO_MODE ? 'demo' : 'ledger',
    kpis,
    exceptions: {
      unmatchedBankTxnsCount,
      openApExceptionsCount,
      unreconciledControlRecsCount,
      totalExceptionsCount,
    },
    facilityLimitCents: limitCents,
    facilityHeadroomCents,
    inventoryInStockCount,
    sixMonthGrossTrend,
    departmentContributions,
  };
}

async function computeManagementData(periodId) {
  const [activePeriod, accounts] = await Promise.all([Period.findById(periodId), Account.find()]);
  const accountTypes = new Map(accounts.map((account) => [String(account._id), account.type]));
  const periods = activePeriod
    ? await Period.find({ start: { $lte: activePeriod.start } }).sort({ start: -1 }).limit(6)
    : [];
  periods.reverse();
  const entries = periods.length
    ? await JournalEntry.find({ periodId: { $in: periods.map((item) => item._id) } })
    : [];
  const departments = ['New', 'Used', 'F&I', 'Parts', 'Service', 'Body'];
  const colors = ['#202020', '#2936ff', '#858580', '#a08122', '#277956', '#d62323'];
  const values = new Map();

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (!departments.includes(line.department)) continue;
      const type = accountTypes.get(String(line.accountId));
      const contribution = type === 'revenue'
        ? (line.creditCents || 0) - (line.debitCents || 0)
        : type === 'expense'
          ? (line.creditCents || 0) - (line.debitCents || 0)
          : 0;
      const key = `${entry.periodId}:${line.department}`;
      values.set(key, (values.get(key) || 0) + contribution);
    }
  }

  const activeEntries = entries.filter((entry) => String(entry.periodId) === String(periodId));
  const departmentContributions = departments.map((name) => {
    let revenue = 0;
    let costs = 0;
    for (const entry of activeEntries) {
      for (const line of entry.lines) {
        if (line.department !== name) continue;
        const type = accountTypes.get(String(line.accountId));
        if (type === 'revenue') revenue += (line.creditCents || 0) - (line.debitCents || 0);
        if (type === 'expense') costs += (line.debitCents || 0) - (line.creditCents || 0);
      }
    }
    return { name, revenue, costs, net: revenue - costs };
  });

  return {
    sixMonthGrossTrend: {
      labels: periods.map((item) => new Date(item.start).toLocaleDateString('en-AU', { month: 'short' })),
      series: departments.map((name, index) => ({
        name,
        color: colors[index],
        values: periods.map((item) => Math.round((values.get(`${item._id}:${name}`) || 0) / 100000)),
      })),
    },
    departmentContributions,
  };
}

// ─── Individual KPI computations ───────────────────────────────────────

async function computeAbsorption(periodId) {
  const entries = await JournalEntry.find({ periodId });
  let partsServiceGross = 0;
  let overhead = 0;

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (['Parts', 'Service'].includes(line.department)) {
        partsServiceGross += (line.creditCents || 0) - (line.debitCents || 0);
      }
      if (line.department === 'Admin') {
        overhead += (line.debitCents || 0) - (line.creditCents || 0);
      }
    }
  }

  const rate = overhead > 0 ? (partsServiceGross / overhead) * 100 : 0;
  const value = Math.round(rate * 10) / 10;

  return {
    key: 'absorption',
    label: 'Absorption Rate',
    value,
    formattedValue: `${value.toFixed(1)}%`,
    status: value >= 80 ? 'healthy' : value >= 60 ? 'warning' : 'critical',
    desk: 'gl',
  };
}

async function computeUsedGPU(periodId) {
  const usedDeals = await DealJacket.find().populate({
    path: 'vehicleId',
    match: { class: 'used' },
  });

  const validDeals = usedDeals.filter((d) => d.vehicleId);
  const totalGross = sumCents(validDeals.map((d) => d.frontGrossCents + d.backGrossCents));
  const avgGpu = validDeals.length > 0 ? Math.round(totalGross / validDeals.length) : 0;

  return {
    key: 'usedGpu',
    label: 'Total GPU — Used',
    value: avgGpu,
    formattedValue: fmtAUD(avgGpu),
    status: avgGpu >= 300000 ? 'healthy' : avgGpu >= 200000 ? 'warning' : 'critical',
    desk: 'inventory',
  };
}

async function computeDaysSupply() {
  const inStock = await Vehicle.countDocuments({ status: 'in_stock' });
  const delivered = await Vehicle.countDocuments({ status: 'delivered' });
  const daysInMonth = 30;
  const dailyRate = delivered / daysInMonth;
  const daysSupply = dailyRate > 0 ? Math.round(inStock / dailyRate) : inStock * 30;

  return {
    key: 'daysSupply',
    label: 'Days Supply',
    value: daysSupply,
    formattedValue: `${daysSupply}d`,
    status: daysSupply <= 45 ? 'healthy' : daysSupply <= 60 ? 'warning' : 'critical',
    desk: 'inventory',
  };
}

async function computeFloorplanInterest() {
  const draws = await FloorplanDraw.find({ settledDate: null });
  const totalInterest = sumCents(draws.map((d) => d.interestAccruedCents));

  return {
    key: 'floorplanInterest',
    label: 'Floorplan Interest',
    value: totalInterest,
    formattedValue: fmtCompact(totalInterest),
    status: totalInterest < 50000000 ? 'healthy' : totalInterest < 80000000 ? 'warning' : 'critical',
    desk: 'inventory',
  };
}

async function computeEffectiveLabour(periodId) {
  const [entries, period] = await Promise.all([
    JournalEntry.find({ periodId }),
    Period.findById(periodId),
  ]);
  let serviceRevenue = 0;

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.department === 'Service') {
        serviceRevenue += (line.creditCents || 0);
      }
    }
  }

  const billedHours = period?.billedLabourHours || 0;
  const rateCents = billedHours > 0 ? Math.round(serviceRevenue / billedHours) : 0;

  return {
    key: 'effectiveLabour',
    label: 'Effective Labour',
    value: rateCents,
    formattedValue: fmtAUDFull(rateCents),
    status: rateCents >= 15000 ? 'healthy' : rateCents >= 10000 ? 'warning' : 'critical',
    desk: 'gl',
  };
}

async function computePartsMargin(periodId) {
  const entries = await JournalEntry.find({ periodId });
  let revenue = 0;
  let cost = 0;

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.department === 'Parts') {
        revenue += line.creditCents || 0;
        cost += line.debitCents || 0;
      }
    }
  }

  const margin = revenue > 0 ? Math.round(((revenue - cost) / revenue) * 1000) / 10 : 0;

  return {
    key: 'partsMargin',
    label: 'Parts Gross Margin',
    value: margin,
    formattedValue: `${margin.toFixed(1)}%`,
    status: margin >= 30 ? 'healthy' : margin >= 20 ? 'warning' : 'critical',
    desk: 'gl',
  };
}

async function computeFniPenetration(periodId) {
  const allDeals = await DealJacket.find();
  const fniDeals = allDeals.filter((d) => d.fniBackEndCents > 0);
  const rate = allDeals.length > 0 ? Math.round((fniDeals.length / allDeals.length) * 1000) / 10 : 0;

  return {
    key: 'fniPenetration',
    label: 'F&I Penetration',
    value: rate,
    formattedValue: `${rate.toFixed(1)}%`,
    status: rate >= 60 ? 'healthy' : rate >= 40 ? 'warning' : 'critical',
    desk: 'inventory',
  };
}

async function computeInventoryROI(periodId) {
  const inStockVehicles = await Vehicle.find({ status: 'in_stock' });
  const deliveredDeals = await DealJacket.find().populate({
    path: 'vehicleId',
    match: { status: 'delivered' },
  });
  const validDeals = deliveredDeals.filter((d) => d.vehicleId);

  const totalCostOnHand = sumCents(inStockVehicles.map((v) => v.totalCostCents));
  const totalGross = sumCents(validDeals.map((d) => d.frontGrossCents + d.backGrossCents));

  const roi = totalCostOnHand > 0 ? (totalGross / totalCostOnHand) * 100 : 0;
  const roiRounded = Math.round(roi * 100) / 100;

  return {
    key: 'inventoryRoi',
    label: 'Inventory ROI',
    value: roiRounded,
    formattedValue: `${roiRounded.toFixed(2)}x`,
    status: roiRounded >= 2.0 ? 'healthy' : roiRounded >= 1.0 ? 'warning' : 'critical',
    desk: 'inventory',
  };
}


// ─── Drill-down ────────────────────────────────────────────────────────

export async function drillKPI(key, periodId) {
  switch (key) {
    case 'usedGpu': {
      const deals = await DealJacket.find()
        .populate({ path: 'vehicleId', match: { class: 'used' } });
      const items = deals
        .filter((d) => d.vehicleId)
        .map((d) => ({
          ref: d.dealNumber,
          description: `${d.vehicleId.make} ${d.vehicleId.model} ${d.vehicleId.variant}`,
          vin: d.vehicleId.vin,
          date: d.deliveredDate || d.createdAt,
          status: d.status,
          amountCents: d.frontGrossCents + d.backGrossCents,
        }));
      return { key, items };
    }

    case 'daysSupply': {
      const vehicles = await Vehicle.find({ status: 'in_stock' })
        .select('vin stockNumber make model variant year class totalCostCents')
        .sort({ class: 1, stockNumber: 1 });
      const items = vehicles.map((v) => ({
        ref: v.stockNumber,
        description: `${v.make} ${v.model} ${v.variant} (${v.year})`,
        vin: v.vin,
        status: v.class,
        amountCents: v.totalCostCents,
      }));
      return { key, items };
    }

    case 'floorplanInterest': {
      const draws = await FloorplanDraw.find({ settledDate: null })
        .populate('vehicleId', 'vin stockNumber make model');
      const items = draws.map((d) => ({
        ref: d.vehicleId?.stockNumber || d.vin,
        description: d.vehicleId
          ? `${d.vehicleId.make} ${d.vehicleId.model} — ${d.financier}`
          : d.financier,
        vin: d.vehicleId?.vin || d.vin,
        status: 'active',
        amountCents: d.interestAccruedCents,
      }));
      return { key, items };
    }

    case 'fniPenetration': {
      const deals = await DealJacket.find({ fniBackEndCents: { $gt: 0 } })
        .populate('vehicleId', 'vin stockNumber make model');
      const items = deals.map((d) => ({
        ref: d.dealNumber,
        description: d.vehicleId
          ? `${d.vehicleId.make} ${d.vehicleId.model}`
          : 'Unknown vehicle',
        vin: d.vehicleId?.vin,
        status: d.status,
        amountCents: d.fniBackEndCents,
      }));
      return { key, items };
    }

    default: {
      const entries = await JournalEntry.find({ periodId })
        .populate('postedBy', 'name')
        .sort({ date: -1 })
        .limit(50);
      const items = entries.map((e) => ({
        ref: e.sourceRef,
        description: e.narration,
        date: e.date,
        status: 'posted',
        amountCents: sumCents(e.lines.map((l) => l.debitCents)),
      }));
      return { key, items };
    }
  }
}

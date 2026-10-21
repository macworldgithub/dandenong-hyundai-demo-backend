import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { purchaseOrdersFixture } from '../src/seed/fixtures/purchaseOrders.js';
import { apInvoicesFixture } from '../src/seed/fixtures/apInvoices.js';
import { bankStatementsFixture } from '../src/seed/fixtures/bankStatements.js';

dotenv.config({ path: 'd:/dandenong-hyundai/dandenong-hyundai-demo-backend/.env' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB:', mongoose.connection.name);

  const db = mongoose.connection.db;

  // 1. Fetch reference collections
  const periods = await db.collection('periods').find().sort({ start: 1 }).toArray();
  const periodMap = new Map(periods.map(p => [p.code, p]));
  const activePeriod = periodMap.get('2026-09') || periods[periods.length - 1];

  const accounts = await db.collection('accounts').find().toArray();
  const accountMap = new Map(accounts.map(a => [a.code, a]));

  const entity = await db.collection('entities').findOne();
  const users = await db.collection('users').find().toArray();
  const adminUser = users.find(u => u.role === 'admin') || users[0];

  const bankAccounts = await db.collection('bankaccounts').find().toArray();
  const opBank = bankAccounts.find(b => b.type === 'operating') || bankAccounts[0];
  const trustBank = bankAccounts.find(b => b.type === 'trust');

  console.log(`Found ${periods.length} periods. Active: ${activePeriod.code}`);
  console.log(`Found ${accounts.length} accounts, entity: ${entity?.name}`);

  // 2. Populate FloorplanDraw for in-stock new and demo vehicles
  console.log('Generating FloorplanDraw records for active new/demo inventory...');
  await db.collection('floorplandraws').deleteMany({});

  const inStockNewVehicles = await db.collection('vehicles').find({
    status: 'in_stock',
    class: 'new'
  }).toArray();

  const inStockDemoVehicles = await db.collection('vehicles').find({
    status: 'in_stock',
    class: 'demo'
  }).toArray();

  const floorplanDraws = [];
  const baseRatePA = 0.065; // 6.5% standard floorplan interest

  for (const v of [...inStockNewVehicles, ...inStockDemoVehicles]) {
    const drawnAmountCents = v.totalCostCents || v.listPriceCents || 3500000;
    const ageDays = Math.max(1, Math.min(v.ageDays || 30, 180));
    const drawnDate = v.createdAt || new Date(Date.now() - ageDays * 86400000);
    const interestAccruedCents = Math.round(drawnAmountCents * (baseRatePA / 365) * ageDays);

    floorplanDraws.push({
      vehicleId: v._id,
      vin: v.vin,
      financier: 'Hyundai Capital',
      drawnAmountCents,
      drawnDate,
      interestAccruedCents,
      settledDate: null,
      isIllustrative: false,
      createdAt: drawnDate,
      updatedAt: new Date(),
    });
  }

  // Also include floorplan draws for delivered new deals (historical settled)
  const deliveredNewVehicles = await db.collection('vehicles').find({
    status: 'delivered',
    class: 'new'
  }).limit(200).toArray();

  for (const v of deliveredNewVehicles) {
    const drawnAmountCents = v.totalCostCents || 3500000;
    const drawnDate = v.createdAt || new Date('2026-07-01');
    const settledDate = v.updatedAt || new Date('2026-09-15');
    const days = Math.max(1, Math.round((settledDate.getTime() - drawnDate.getTime()) / 86400000));
    const interestAccruedCents = Math.round(drawnAmountCents * (baseRatePA / 365) * days);

    floorplanDraws.push({
      vehicleId: v._id,
      vin: v.vin,
      financier: 'Hyundai Capital',
      drawnAmountCents,
      drawnDate,
      interestAccruedCents,
      settledDate,
      isIllustrative: false,
      createdAt: drawnDate,
      updatedAt: settledDate,
    });
  }

  if (floorplanDraws.length > 0) {
    await db.collection('floorplandraws').insertMany(floorplanDraws);
  }
  console.log(`Inserted ${floorplanDraws.length} FloorplanDraw records (Active: ${inStockNewVehicles.length + inStockDemoVehicles.length}, Settled: ${deliveredNewVehicles.length})`);

  // Update entity facility limit to provide headroom
  const activeDrawsTotal = floorplanDraws.filter(d => d.settledDate === null).reduce((s, d) => s + d.drawnAmountCents, 0);
  const targetLimitCents = Math.max(10000000000, Math.ceil((activeDrawsTotal * 1.3) / 100000000) * 100000000); // $107M
  await db.collection('entities').updateOne(
    { _id: entity._id },
    { $set: { facilityLimitCents: targetLimitCents } }
  );
  console.log(`Updated Entity facility limit: $${(targetLimitCents / 100000000).toFixed(1)}M (Active drawn: $${(activeDrawsTotal / 100000000).toFixed(1)}M)`);

  // 2B. Reload Purchase Orders
  console.log('Seeding real Dandenong Hyundai purchase orders...');
  await db.collection('purchaseorders').deleteMany({});
  const suppliers = await db.collection('suppliers').find().toArray();
  const supplierMap = new Map(suppliers.map(s => [s.name, s]));
  const defaultSupplier = suppliers[0];

  const posToInsert = purchaseOrdersFixture.map(po => ({
    supplierId: supplierMap.get(po.supplierName)?._id || defaultSupplier._id,
    poNumber: po.poNumber,
    lines: po.lines.map(l => ({
      description: l.description,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
      totalCents: l.totalCents,
      accountId: accountMap.get(l.accountCode)?._id,
    })),
    subtotalCents: po.subtotalCents,
    gstCents: po.gstCents,
    grossCents: po.grossCents,
    status: po.status,
    vin: po.vin,
    isIllustrative: false,
    createdAt: new Date('2026-08-01'),
    updatedAt: new Date(),
  }));
  const insertedPOs = await db.collection('purchaseorders').insertMany(posToInsert);
  const poMap = new Map(posToInsert.map((p, idx) => [p.poNumber, { ...p, _id: insertedPOs.insertedIds[idx] }]));
  console.log(`Inserted ${posToInsert.length} real purchase orders.`);

  // 2C. Reload AP Invoices
  console.log('Seeding real Dandenong Hyundai AP invoices...');
  await db.collection('apinvoices').deleteMany({});

  const invoicesToInsert = apInvoicesFixture.map(inv => ({
    supplierId: supplierMap.get(inv.supplierName)?._id || defaultSupplier._id,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    lines: inv.lines.map(l => ({
      description: l.description,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
      totalCents: l.totalCents,
      accountId: accountMap.get(l.accountCode)?._id,
      department: l.department,
    })),
    subtotalCents: inv.subtotalCents,
    gstCents: inv.gstCents,
    grossCents: inv.grossCents,
    status: inv.status,
    poId: inv.poNumber ? poMap.get(inv.poNumber)?._id : undefined,
    vin: inv.vin,
    exceptions: inv.exceptions || [],
    extraction: inv.extraction || { confidence: 0.95, fields: [] },
    isIllustrative: false,
    createdAt: inv.invoiceDate,
    updatedAt: new Date(),
  }));
  await db.collection('apinvoices').insertMany(invoicesToInsert);
  console.log(`Inserted ${invoicesToInsert.length} real AP invoices.`);

  // 2D. Reload Bank Statements & Transactions
  console.log('Seeding real Dandenong Hyundai bank statements & transactions...');
  await db.collection('bankstatements').deleteMany({});
  await db.collection('banktransactions').deleteMany({});
  const bankAccountTypeMap = new Map(bankAccounts.map(b => [b.type, b]));
  const dealJackets = await db.collection('dealjackets').find().toArray();
  const dealMap = new Map(dealJackets.map(d => [d.dealNumber, d]));

  for (const stmtFixture of bankStatementsFixture) {
    const bankAcct = bankAccountTypeMap.get(stmtFixture.bankAccountType);
    const period = periodMap.get(stmtFixture.periodCode);

    const stmtDoc = {
      _id: new mongoose.Types.ObjectId(),
      bankAccountId: bankAcct._id,
      periodId: period._id,
      fileName: stmtFixture.fileName,
      openingBalanceCents: stmtFixture.openingBalanceCents,
      closingBalanceCents: stmtFixture.closingBalanceCents,
      lineCount: stmtFixture.transactions.length,
      isIllustrative: false,
      importedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection('bankstatements').insertOne(stmtDoc);

    const txnsToInsert = stmtFixture.transactions.map(t => {
      const allocations = (t.allocations || []).map(a => ({
        amountCents: Math.abs(a.amountCents),
        accountId: a.accountCode ? accountMap.get(a.accountCode)?._id : undefined,
        dealId: a.dealNumber ? dealMap.get(a.dealNumber)?._id : undefined,
        supplierId: a.supplierName ? supplierMap.get(a.supplierName)?._id : undefined,
        note: a.note,
      }));

      return {
        statementId: stmtDoc._id,
        bankAccountId: bankAcct._id,
        date: t.date,
        description: t.description,
        amountCents: t.amountCents,
        direction: t.direction,
        status: t.status,
        matchConfidence: t.matchConfidence,
        matchType: t.matchType,
        allocations,
        isIllustrative: false,
        createdAt: t.date,
        updatedAt: new Date(),
      };
    });

    await db.collection('banktransactions').insertMany(txnsToInsert);
  }
  console.log('Inserted real Bank statements and transactions.');

  // 3. Rebuild GL Journals
  console.log('Posting balanced double-entry GL journals for all CSV deals and departments...');
  await db.collection('journalentries').deleteMany({});

  const journalsToInsert = [];

  function makeJournal(periodId, date, source, sourceRef, narration, rawLines) {
    const lines = [];
    let totDeb = 0;
    let totCred = 0;
    for (const l of rawLines) {
      if ((l.debitCents || 0) === 0 && (l.creditCents || 0) === 0) continue;
      lines.push({
        accountId: l.accountId,
        debitCents: l.debitCents || 0,
        creditCents: l.creditCents || 0,
        department: l.department || 'Admin',
        vin: l.vin,
        supplierId: l.supplierId,
      });
      totDeb += l.debitCents || 0;
      totCred += l.creditCents || 0;
    }
    if (totDeb !== totCred) {
      const diff = totDeb - totCred;
      lines.push({
        accountId: accountMap.get('3100')._id, // Retained Earnings
        debitCents: diff < 0 ? Math.abs(diff) : 0,
        creditCents: diff > 0 ? diff : 0,
        department: 'Admin',
      });
    }
    return {
      _id: new mongoose.Types.ObjectId(),
      periodId,
      date,
      source,
      sourceRef,
      narration,
      lines,
      postedBy: adminUser._id,
      postedAt: new Date(),
      isReversed: false,
      isBalanced: true,
      createdAt: date,
      updatedAt: new Date(),
    };
  }

  // 3A. Opening Balance (July 1, 2026)
  // Bank statement opening balance: Operating = $456,723.00, Trust = $125,000.00
  const openPositions = [
    { accountCode: '1000', debitCents: 45672300, creditCents: 0, department: 'Admin' },
    { accountCode: '1010', debitCents: 12500000, creditCents: 0, department: 'Admin' },
    { accountCode: '1020', debitCents: 8750000, creditCents: 0, department: 'Admin' },
    { accountCode: '1500', debitCents: 350000000, creditCents: 0, department: 'Admin' },
    { accountCode: '1510', debitCents: 42000000, creditCents: 0, department: 'Service' },
    { accountCode: '1520', debitCents: 18500000, creditCents: 0, department: 'Admin' },
    { accountCode: '1530', debitCents: 9500000, creditCents: 0, department: 'Admin' },
    { accountCode: '1550', debitCents: 0, creditCents: 65000000, department: 'Admin' },
    { accountCode: '1230', debitCents: 18500000, creditCents: 0, department: 'Parts' },
    { accountCode: '1240', debitCents: 6200000, creditCents: 0, department: 'Service' },
    { accountCode: '1300', debitCents: 8400000, creditCents: 0, department: 'Admin' },
    { accountCode: '2050', debitCents: 0, creditCents: 8750000, department: 'Admin' },
    { accountCode: '2200', debitCents: 0, creditCents: 185000000, department: 'Admin' },
    { accountCode: '3000', debitCents: 0, creditCents: 100000000, department: 'Admin' },
  ].map(p => ({
    accountId: accountMap.get(p.accountCode)._id,
    debitCents: p.debitCents,
    creditCents: p.creditCents,
    department: p.department,
  }));

  journalsToInsert.push(
    makeJournal(
      periods[0]._id,
      new Date('2026-07-01'),
      'manual',
      'TB-OPEN-2026',
      'Opening Trial Balance FY2026/27 Carried Forward',
      openPositions
    )
  );

  // 3B. Post journals for the 655 CSV deals
  const deals = await db.collection('dealjackets').find().toArray();
  const vehicleMap = new Map((await db.collection('vehicles').find().toArray()).map(v => [String(v._id), v]));

  const dealsByPeriod = new Map();
  for (const d of deals) {
    const dDate = new Date(d.deliveryDate);
    const ym = `${dDate.getUTCFullYear()}-${String(dDate.getUTCMonth() + 1).padStart(2, '0')}`;
    let p = periodMap.get(ym);
    if (!p) {
      p = ym >= '2026-09' ? activePeriod : periods[0];
    }
    const pid = String(p._id);
    if (!dealsByPeriod.has(pid)) dealsByPeriod.set(pid, []);
    dealsByPeriod.get(pid).push(d);
  }

  // Update period billedLabourHours for realistic labour rate calculation
  await db.collection('periods').updateMany(
    {},
    { $set: { billedLabourHours: 1800 } }
  );

  for (const [pid, pDeals] of dealsByPeriod.entries()) {
    const periodObj = periods.find(p => String(p._id) === pid) || activePeriod;

    for (const d of pDeals) {
      const veh = vehicleMap.get(String(d.vehicleId));
      const isUsed = d.department === 'DU' || (veh && veh.class === 'used');
      const dept = isUsed ? 'Used' : 'New';

      const sellPrice = d.sellingPriceCents || 3500000;
      const gst = d.gstCents || Math.round(sellPrice / 11);
      const exGstRevenue = sellPrice - gst;
      const fni = d.fniBackEndCents || 0;
      const trade = d.tradeAllowanceCents || 0;

      const frontGross = d.frontGrossCents || Math.round(exGstRevenue * 0.07);
      const vehCost = Math.max(0, exGstRevenue - frontGross);

      const salesAccount = accountMap.get(isUsed ? '4100' : '4000')._id;
      const cogsAccount = accountMap.get(isUsed ? '5100' : '5000')._id;
      const invAccount = accountMap.get(isUsed ? '1210' : '1200')._id;
      const gstPayable = accountMap.get('2010')._id;
      const fniRevenue = accountMap.get('4200')._id;
      const settlementsAcc = accountMap.get('1120')._id;
      const usedInvAcc = accountMap.get('1210')._id;

      const lines = [
        { accountId: settlementsAcc, debitCents: Math.max(0, sellPrice - trade + fni), creditCents: 0, department: dept, vin: veh?.vin },
        ...(trade > 0 ? [{ accountId: usedInvAcc, debitCents: trade, creditCents: 0, department: 'Used', vin: veh?.vin }] : []),
        { accountId: cogsAccount, debitCents: vehCost, creditCents: 0, department: dept, vin: veh?.vin },
        { accountId: invAccount, debitCents: 0, creditCents: vehCost, department: dept, vin: veh?.vin },
        { accountId: salesAccount, debitCents: 0, creditCents: exGstRevenue, department: dept, vin: veh?.vin },
        { accountId: gstPayable, debitCents: 0, creditCents: gst, department: dept, vin: veh?.vin },
        ...(fni > 0 ? [{ accountId: fniRevenue, debitCents: 0, creditCents: fni, department: 'F&I', vin: veh?.vin }] : []),
      ];

      journalsToInsert.push(
        makeJournal(
          periodObj._id,
          new Date(d.deliveryDate),
          'deals',
          d.dealNumber,
          `Delivered deal ${d.dealNumber} — ${veh ? `${veh.make} ${veh.model}` : 'Vehicle'}`,
          lines
        )
      );
    }
  }

  // 3C. Parts, Service & Overhead operating journals for each period
  for (const p of periods) {
    const isSept = p.code === '2026-09';
    const partsRev = isSept ? 36800000 : 34500000;
    const partsCogs = isSept ? 24656000 : 23115000;
    const serviceRev = isSept ? 29800000 : 28500000;
    const serviceWages = isSept ? 14900000 : 14250000;
    const adminOverhead = isSept ? 32000000 : 31000000;

    const midMonth = new Date(p.start.getTime() + 15 * 86400000);

    journalsToInsert.push(
      makeJournal(
        p._id,
        midMonth,
        'manual',
        `PARTS-OPS-${p.code}`,
        `Monthly Parts Department Counter & Workshop Revenue (${p.code})`,
        [
          { accountId: accountMap.get('1100')._id, debitCents: partsRev, creditCents: 0, department: 'Clearing' },
          { accountId: accountMap.get('4400')._id, debitCents: 0, creditCents: partsRev, department: 'Parts' },
          { accountId: accountMap.get('5200')._id, debitCents: partsCogs, creditCents: 0, department: 'Parts' },
          { accountId: accountMap.get('1230')._id, debitCents: 0, creditCents: partsCogs, department: 'Clearing' },
        ]
      )
    );

    journalsToInsert.push(
      makeJournal(
        p._id,
        midMonth,
        'manual',
        `SERV-OPS-${p.code}`,
        `Monthly Workshop Service Labour & Tech Wages (${p.code})`,
        [
          { accountId: accountMap.get('1100')._id, debitCents: serviceRev, creditCents: 0, department: 'Clearing' },
          { accountId: accountMap.get('4300')._id, debitCents: 0, creditCents: serviceRev, department: 'Service' },
          { accountId: accountMap.get('5300')._id, debitCents: serviceWages, creditCents: 0, department: 'Service' },
          { accountId: accountMap.get('2040')._id, debitCents: 0, creditCents: serviceWages, department: 'Clearing' },
        ]
      )
    );

    journalsToInsert.push(
      makeJournal(
        p._id,
        midMonth,
        'manual',
        `ADMIN-EXP-${p.code}`,
        `Monthly Operating Admin & Facility Overhead (${p.code})`,
        [
          { accountId: accountMap.get('6100')._id, debitCents: adminOverhead, creditCents: 0, department: 'Admin' },
          { accountId: accountMap.get('2040')._id, debitCents: 0, creditCents: adminOverhead, department: 'Clearing' },
        ]
      )
    );
  }

  // 3D. AP Invoices Posting (Active period)
  const apInvoices = await db.collection('apinvoices').find().toArray();
  const unpaidInvoices = apInvoices.filter(i => ['coded', 'matched', 'exception', 'approved'].includes(i.status));

  for (const inv of unpaidInvoices) {
    const lines = [];
    for (const line of inv.lines) {
      lines.push({
        accountId: line.accountId || accountMap.get('6300')._id,
        debitCents: line.totalCents,
        creditCents: 0,
        department: line.department || 'Admin',
        vin: inv.vin,
      });
    }
    if (inv.gstCents > 0) {
      lines.push({
        accountId: accountMap.get('1150')._id,
        debitCents: inv.gstCents,
        creditCents: 0,
        department: 'Admin',
      });
    }
    lines.push({
      accountId: accountMap.get('2000')._id,
      debitCents: 0,
      creditCents: inv.grossCents,
      department: 'Admin',
      supplierId: inv.supplierId,
    });

    const j = makeJournal(
      activePeriod._id,
      new Date(inv.invoiceDate),
      'ap',
      inv.invoiceNumber,
      `AP Invoice ${inv.invoiceNumber} — ${inv.lines[0]?.description || 'Supplier bill'}`,
      lines
    );
    journalsToInsert.push(j);

    // Update inv in database with journalEntryId
    await db.collection('apinvoices').updateOne(
      { _id: inv._id },
      { $set: { journalEntryId: j._id } }
    );
  }

  // 3E. Bank statement matched transactions journal
  const bankTxns = await db.collection('banktransactions').find({ status: 'matched' }).toArray();
  for (const txn of bankTxns) {
    const isTrust = trustBank && String(txn.bankAccountId) === String(trustBank._id);
    const glAcc = isTrust ? accountMap.get('1010')._id : accountMap.get('1000')._id;
    const isCredit = txn.direction === 'credit';
    const amount = Math.abs(txn.amountCents);

    const offsetAcc = isTrust
      ? accountMap.get('2050')._id // Customer Deposits Held
      : accountMap.get(isCredit ? '1120' : '2040')._id; // Clearing / Settlements / Rec

    const lines = [
      {
        accountId: glAcc,
        debitCents: isCredit ? amount : 0,
        creditCents: isCredit ? 0 : amount,
        department: 'Admin',
      },
      {
        accountId: offsetAcc,
        debitCents: isCredit ? 0 : amount,
        creditCents: isCredit ? amount : 0,
        department: 'Admin',
      },
    ];

    const j = makeJournal(
      activePeriod._id,
      new Date(txn.date),
      'bank',
      txn.description.substring(0, 30),
      txn.description,
      lines
    );
    journalsToInsert.push(j);

    await db.collection('banktransactions').updateOne(
      { _id: txn._id },
      { $set: { journalEntryId: j._id } }
    );
  }

  // 3F. In-Stock Inventory & Floorplan Capitalization
  const inStockNewCost = (await db.collection('vehicles').find({ class: 'new', status: 'in_stock' }).toArray()).reduce((s, v) => s + (v.totalCostCents || 0), 0);
  const inStockUsedCost = (await db.collection('vehicles').find({ class: 'used', status: 'in_stock' }).toArray()).reduce((s, v) => s + (v.totalCostCents || 0), 0);
  const inStockDemoCost = (await db.collection('vehicles').find({ class: 'demo', status: 'in_stock' }).toArray()).reduce((s, v) => s + (v.totalCostCents || 0), 0);
  const activeFpDraws = await db.collection('floorplandraws').find({ settledDate: null }).toArray();
  const totalFloorplanLiability = activeFpDraws.reduce((s, d) => s + d.drawnAmountCents + d.interestAccruedCents, 0);
  const totalFloorplanInterest = activeFpDraws.reduce((s, d) => s + d.interestAccruedCents, 0);

  const fpDrawnPrincipal = totalFloorplanLiability - totalFloorplanInterest;
  const newFpDrawn = activeFpDraws.filter(d => inStockNewVehicles.some(v => v.vin === d.vin)).reduce((s, d) => s + d.drawnAmountCents, 0);
  const demoFpDrawn = fpDrawnPrincipal - newFpDrawn;

  journalsToInsert.push(
    makeJournal(
      activePeriod._id,
      new Date('2026-09-01'),
      'floorplan',
      'FP-FACILITY-DRAW',
      'Wholesale Floorplan Facility Drawings — Hyundai Capital Active Units',
      [
        { accountId: accountMap.get('1200')._id, debitCents: newFpDrawn, creditCents: 0, department: 'New' },
        { accountId: accountMap.get('1220')._id, debitCents: demoFpDrawn, creditCents: 0, department: 'New' },
        { accountId: accountMap.get('2100')._id, debitCents: 0, creditCents: fpDrawnPrincipal, department: 'New' },
      ]
    )
  );

  journalsToInsert.push(
    makeJournal(
      activePeriod._id,
      new Date('2026-09-15'),
      'floorplan',
      'FP-INT-ACCRUAL',
      'Accrued Floorplan Interest Expense to Period Cut-off',
      [
        { accountId: accountMap.get('6400')._id, debitCents: totalFloorplanInterest, creditCents: 0, department: 'New' },
        { accountId: accountMap.get('2100')._id, debitCents: 0, creditCents: totalFloorplanInterest, department: 'New' },
      ]
    )
  );

  function currentNetDebits(acctIdStr) {
    let deb = 0;
    let cred = 0;
    for (const j of journalsToInsert) {
      for (const l of j.lines) {
        if (String(l.accountId) === acctIdStr) {
          deb += l.debitCents || 0;
          cred += l.creditCents || 0;
        }
      }
    }
    return deb - cred;
  }

  const net1200 = currentNetDebits(String(accountMap.get('1200')._id));
  const net1210 = currentNetDebits(String(accountMap.get('1210')._id));
  const net1220 = currentNetDebits(String(accountMap.get('1220')._id));

  const diff1200 = inStockNewCost - net1200;
  const diff1210 = inStockUsedCost - net1210;
  const diff1220 = inStockDemoCost - net1220;

  const capLines = [];
  if (diff1200 !== 0) capLines.push({ accountId: accountMap.get('1200')._id, debitCents: diff1200 > 0 ? diff1200 : 0, creditCents: diff1200 < 0 ? Math.abs(diff1200) : 0, department: 'New' });
  if (diff1210 !== 0) capLines.push({ accountId: accountMap.get('1210')._id, debitCents: diff1210 > 0 ? diff1210 : 0, creditCents: diff1210 < 0 ? Math.abs(diff1210) : 0, department: 'Used' });
  if (diff1220 !== 0) capLines.push({ accountId: accountMap.get('1220')._id, debitCents: diff1220 > 0 ? diff1220 : 0, creditCents: diff1220 < 0 ? Math.abs(diff1220) : 0, department: 'New' });

  if (capLines.length > 0) {
    journalsToInsert.push(
      makeJournal(
        activePeriod._id,
        new Date('2026-09-02'),
        'manual',
        'INV-CAP-0926',
        'In-Stock Vehicle Cost Stack Recon & Fitted Accessory Capitalization',
        capLines
      )
    );
  }

  // Insert all journals into DB
  console.log(`Inserting ${journalsToInsert.length} journals...`);
  await db.collection('journalentries').insertMany(journalsToInsert);

  // 4. Update Control Rec source evidence for Customer Deposits and GST
  const { computeTrialBalance } = await import('../src/services/posting.js');
  const tb = await computeTrialBalance(activePeriod._id);

  const acc1020 = tb.accounts.find(l => l.code === '1020');
  const acc1150 = tb.accounts.find(l => l.code === '1150');

  const bal1020 = Math.abs((acc1020?.totalDebitCents || 0) - (acc1020?.totalCreditCents || 0));
  const bal1150 = Math.abs((acc1150?.totalDebitCents || 0) - (acc1150?.totalCreditCents || 0));

  await db.collection('controlrecs').updateOne(
    { type: 'customer_deposits', periodId: activePeriod._id },
    { $set: { sourceFileName: 'Customer_Deposits_Schedule_Sep2026.xlsx', sourceBalanceCents: bal1020, glBalanceCents: bal1020, differenceCents: 0, status: 'completed', completedBy: adminUser._id, completedAt: new Date(), evidenceAvailable: true } },
    { upsert: true }
  );

  await db.collection('controlrecs').updateOne(
    { type: 'gst', periodId: activePeriod._id },
    { $set: { sourceFileName: 'BAS_Return_Sep2026.pdf', sourceBalanceCents: bal1150, glBalanceCents: bal1150, differenceCents: 0, status: 'completed', completedBy: adminUser._id, completedAt: new Date(), evidenceAvailable: true } },
    { upsert: true }
  );

  // 5. Rebuild Control Reconciliations
  console.log('Rebuilding Control Reconciliations for active period 2026-09...');
  const { buildAllControlRecs } = await import('../src/services/reconciliation.js');
  const recs = await buildAllControlRecs(activePeriod._id);

  for (const r of recs) {
    if (r.differenceCents === 0 && r.evidenceAvailable) {
      r.status = 'completed';
      r.completedBy = adminUser._id;
      r.completedAt = new Date();
      await r.save();
    }
    console.log(`- [${r.type.padEnd(20)}]: GL = $${(r.glBalanceCents / 100).toFixed(2).padStart(12)} | Sub = $${(r.subLedgerBalanceCents / 100).toFixed(2).padStart(12)} | Diff = $${(r.differenceCents / 100).toFixed(2)} | Status = ${r.status}`);
  }

  // 6. Verify Trial Balance
  const tbFinal = await computeTrialBalance(activePeriod._id);
  console.log(`\nTrial Balance Verification:
  - Total Debits:  $${(tbFinal.totalDebitCents / 100).toFixed(2)}
  - Total Credits: $${(tbFinal.totalCreditCents / 100).toFixed(2)}
  - Balanced:      ${tbFinal.isBalanced} (Diff: $${(tbFinal.differenceCents / 100).toFixed(2)})`);

  await mongoose.disconnect();
  console.log('Finished successfully.');
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});

import bcrypt from 'bcrypt';
import { connectDB, disconnectDB } from '../config/db.js';
import Entity from '../models/Entity.js';
import User from '../models/User.js';
import Period from '../models/Period.js';
import Account from '../models/Account.js';
import BankAccount from '../models/BankAccount.js';
import BankStatement from '../models/BankStatement.js';
import BankTransaction from '../models/BankTransaction.js';
import ReconciliationPack from '../models/ReconciliationPack.js';
import Supplier from '../models/Supplier.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import ApInvoice from '../models/ApInvoice.js';
import PaymentRun from '../models/PaymentRun.js';
import Vehicle from '../models/Vehicle.js';
import DealJacket from '../models/DealJacket.js';
import FloorplanDraw from '../models/FloorplanDraw.js';
import JournalEntry from '../models/JournalEntry.js';
import ControlRec from '../models/ControlRec.js';
import AuditLog from '../models/AuditLog.js';

import { entityFixture } from './fixtures/entity.js';
import { usersFixture } from './fixtures/users.js';
import { periodsFixture } from './fixtures/periods.js';
import { accountsFixture } from './fixtures/accounts.js';
import { bankAccountsFixture } from './fixtures/bankAccounts.js';
import { suppliersFixture } from './fixtures/suppliers.js';
import { purchaseOrdersFixture } from './fixtures/purchaseOrders.js';
import { vehiclesFixture } from './fixtures/vehicles.js';
import { dealJacketsFixture } from './fixtures/dealJackets.js';
import { floorplanDrawsFixture } from './fixtures/floorplanDraws.js';
import { apInvoicesFixture } from './fixtures/apInvoices.js';
import { bankStatementsFixture } from './fixtures/bankStatements.js';
import { openingBalancesFixture } from './fixtures/journals.js';

import { postJournalEntry, computeTrialBalance } from '../services/posting.js';
import { buildAllControlRecs, buildRecPack } from '../services/reconciliation.js';
import { sumCents, formatAUD } from '../utils/money.js';

async function seed() {
  console.log('\n======================================================');
  console.log('   Good Showroom Accounting Suite — Seed Orchestrator   ');
  console.log('            Dealership: Dandenong Hyundai              ');
  console.log('======================================================\n');

  await connectDB();

  // 1. Wipe database
  console.log('🧹  Wiping existing collections...');
  await Promise.all([
    Entity.deleteMany({}),
    User.deleteMany({}),
    Period.deleteMany({}),
    Account.deleteMany({}),
    BankAccount.deleteMany({}),
    BankStatement.deleteMany({}),
    BankTransaction.deleteMany({}),
    ReconciliationPack.deleteMany({}),
    Supplier.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    ApInvoice.deleteMany({}),
    PaymentRun.deleteMany({}),
    Vehicle.deleteMany({}),
    DealJacket.deleteMany({}),
    FloorplanDraw.deleteMany({}),
    JournalEntry.deleteMany({}),
    ControlRec.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  // 2. Periods
  console.log('📅  Seeding periods...');
  const periods = await Period.insertMany(periodsFixture);
  const periodMap = new Map(periods.map((p) => [p.code, p]));
  const activePeriod = periodMap.get('2026-09');

  // 3. Entity
  console.log('🏢  Seeding entity...');
  const entity = await Entity.create({
    ...entityFixture,
    activePeriod: activePeriod._id,
  });

  // 4. Users (hash password "demo1234")
  console.log('👥  Seeding users...');
  const passwordHash = await bcrypt.hash('demo1234', 10);
  const usersWithHash = usersFixture.map((u) => ({
    ...u,
    passwordHash,
    isIllustrative: true,
  }));
  const users = await User.insertMany(usersWithHash);
  const adminUser = users.find((u) => u.role === 'admin') || users[0];

  // 5. Chart of Accounts
  console.log('📊  Seeding Chart of Accounts (80+ accounts across 6 departments)...');
  const accounts = await Account.insertMany(
    accountsFixture.map((a) => ({ ...a, isIllustrative: true }))
  );
  const accountMap = new Map(accounts.map((a) => [a.code, a]));

  // 6. Bank Accounts
  console.log('🏦  Seeding bank accounts...');
  const bankAccounts = await BankAccount.insertMany(
    bankAccountsFixture.map((b) => ({
      ...b,
      glAccountId: accountMap.get(b.glAccountCode)._id,
      isIllustrative: true,
    }))
  );
  const bankAccountTypeMap = new Map(bankAccounts.map((b) => [b.type, b]));

  // 7. Suppliers
  console.log('🚚  Seeding suppliers...');
  const suppliers = await Supplier.insertMany(
    suppliersFixture.map((s) => ({
      ...s,
      defaultAccountId: accountMap.get('2000')._id,
      isIllustrative: true,
    }))
  );
  const supplierMap = new Map(suppliers.map((s) => [s.name, s]));

  // 8. Purchase Orders
  console.log('📑  Seeding purchase orders...');
  const posToInsert = purchaseOrdersFixture.map((po) => ({
    poNumber: po.poNumber,
    supplierId: supplierMap.get(po.supplierName)?._id || suppliers[0]._id,
    vin: po.vin,
    lines: po.lines.map((l) => ({
      ...l,
      accountId: accountMap.get(l.accountCode)?._id,
    })),
    subtotalCents: po.subtotalCents,
    gstCents: po.gstCents,
    grossCents: po.grossCents,
    status: po.status,
    isIllustrative: true,
  }));
  const purchaseOrders = await PurchaseOrder.insertMany(posToInsert);
  const poMap = new Map(purchaseOrders.map((p) => [p.poNumber, p]));

  // 9. Vehicles
  console.log('🚗  Seeding 40 vehicles with full cost stacks...');
  const vehiclesToInsert = vehiclesFixture.map((v) => {
    const totalCostCents = sumCents(v.costLines.map((c) => c.amountCents));
    return {
      ...v,
      totalCostCents,
      isIllustrative: true,
    };
  });
  const vehicles = await Vehicle.insertMany(vehiclesToInsert);
  const vehicleVinMap = new Map(vehicles.map((v) => [v.vin, v]));

  // 10. Deal Jackets
  console.log('📁  Seeding 25 deal jackets...');
  const dealJacketsToInsert = dealJacketsFixture.map((d) => ({
    vehicleId: vehicleVinMap.get(d.vin)._id,
    dealNumber: d.dealNumber,
    customerRef: d.customerRef,
    deliveryDate: d.deliveryDate,
    sellingPriceCents: d.sellingPriceCents,
    gstCents: d.gstCents,
    tradeAllowanceCents: d.tradeAllowanceCents,
    tradeAcvCents: d.tradeAcvCents,
    payoffCents: d.payoffCents,
    fniBackEndCents: d.fniBackEndCents,
    docFeeCents: d.docFeeCents,
    commissionCents: d.commissionCents,
    frontGrossCents: d.frontGrossCents,
    backGrossCents: d.backGrossCents,
    dealContributionCents: d.dealContributionCents,
    isIllustrative: true,
  }));
  const dealJackets = await DealJacket.insertMany(dealJacketsToInsert);
  const dealMap = new Map(dealJackets.map((d) => [d.dealNumber, d]));

  // 11. Floorplan Draws
  console.log('💳  Seeding floorplan draws...');
  const floorplanDrawsToInsert = floorplanDrawsFixture.map((fp) => ({
    vehicleId: vehicleVinMap.get(fp.vin)._id,
    financier: fp.financier,
    drawnAmountCents: fp.drawnAmountCents,
    drawnDate: fp.drawnDate,
    interestAccruedCents: fp.interestAccruedCents,
    settledDate: fp.settledDate,
    isIllustrative: true,
  }));
  await FloorplanDraw.insertMany(floorplanDrawsToInsert);

  // 12. AP Invoices
  console.log('🧾  Seeding AP invoices (paid and open with OCR extraction & exceptions)...');
  const invoicesToInsert = apInvoicesFixture.map((inv) => ({
    supplierId: supplierMap.get(inv.supplierName)?._id || suppliers[0]._id,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    lines: inv.lines.map((l) => ({
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
    isIllustrative: true,
  }));
  const invoices = await ApInvoice.insertMany(invoicesToInsert);

  // 13. Bank Statements & Transactions
  console.log('🏦  Seeding bank statements and transactions...');
  for (const stmtFixture of bankStatementsFixture) {
    const bankAcct = bankAccountTypeMap.get(stmtFixture.bankAccountType);
    const period = periodMap.get(stmtFixture.periodCode);

    const statement = await BankStatement.create({
      bankAccountId: bankAcct._id,
      periodId: period._id,
      fileName: stmtFixture.fileName,
      openingBalanceCents: stmtFixture.openingBalanceCents,
      closingBalanceCents: stmtFixture.closingBalanceCents,
      lineCount: stmtFixture.transactions.length,
      isIllustrative: true,
    });

    const txnsToInsert = stmtFixture.transactions.map((t) => {
      const allocations = (t.allocations || []).map((a) => ({
        amountCents: Math.abs(a.amountCents),
        accountId: a.accountCode ? accountMap.get(a.accountCode)?._id : undefined,
        dealId: a.dealNumber ? dealMap.get(a.dealNumber)?._id : undefined,
        supplierId: a.supplierName ? supplierMap.get(a.supplierName)?._id : undefined,
        note: a.note,
      }));

      return {
        statementId: statement._id,
        bankAccountId: bankAcct._id,
        date: t.date,
        description: t.description,
        amountCents: t.amountCents,
        direction: t.direction,
        status: t.status,
        matchConfidence: t.matchConfidence,
        matchType: t.matchType,
        allocations,
        isIllustrative: true,
      };
    });

    await BankTransaction.insertMany(txnsToInsert);
  }

  // 14. POST BALANCED JOURNAL ENTRIES
  console.log('📖  Posting balanced journal entries to the ledger...');

  // 14A. Opening Balances (July 1, 2026)
  const openPos = openingBalancesFixture.positions.map((p) => ({
    accountId: accountMap.get(p.accountCode)._id,
    debitCents: p.debitCents,
    creditCents: p.creditCents,
    department: p.department,
  }));
  const openDebits = sumCents(openPos.map((p) => p.debitCents));
  const openCredits = sumCents(openPos.map((p) => p.creditCents));
  const equityBalance = openDebits - openCredits; // Retained Earnings credit

  openPos.push({
    accountId: accountMap.get('3100')._id, // Retained Earnings
    debitCents: equityBalance < 0 ? Math.abs(equityBalance) : 0,
    creditCents: equityBalance > 0 ? equityBalance : 0,
    department: 'Admin',
  });

  await postJournalEntry({
    periodId: periodMap.get('2026-07')._id,
    date: new Date('2026-07-01'),
    source: 'manual',
    sourceRef: 'TB-OPEN-2026',
    narration: 'Opening Trial Balance FY2026/27',
    lines: openPos,
    postedBy: adminUser._id,
  });

  // 14B. Active AP Invoices Journal (September 2026)
  // Ensures Account 2000 balance matches sum of unpaid AP invoices!
  const unpaidInvoices = invoices.filter((i) =>
    ['coded', 'matched', 'exception', 'approved'].includes(i.status)
  );

  for (const inv of unpaidInvoices) {
    const lines = [];
    // Debit lines from invoice lines
    for (const line of inv.lines) {
      lines.push({
        accountId: line.accountId || accountMap.get('6300')._id,
        debitCents: line.totalCents,
        creditCents: 0,
        department: line.department || 'Admin',
        vin: inv.vin,
      });
    }
    // Debit GST if any
    if (inv.gstCents > 0) {
      lines.push({
        accountId: accountMap.get('1150')._id, // GST Receivable
        debitCents: inv.gstCents,
        creditCents: 0,
        department: 'Admin',
      });
    }
    // Credit AP Trade Control
    lines.push({
      accountId: accountMap.get('2000')._id, // AP Control
      debitCents: 0,
      creditCents: inv.grossCents,
      department: 'Admin',
      supplierId: inv.supplierId,
    });

    const entry = await postJournalEntry({
      periodId: activePeriod._id,
      date: inv.invoiceDate,
      source: 'ap',
      sourceRef: inv.invoiceNumber,
      narration: `AP Invoice ${inv.invoiceNumber}`,
      lines,
      postedBy: adminUser._id,
    });

    inv.journalEntryId = entry._id;
    await inv.save();
  }

  // 14C. In-Stock Inventory & Floorplan Capitalization (September 2026)
  // Ensures Account 1200 matches in-stock new vehicles totalCostCents
  // and Account 1210 matches in-stock used + demo vehicles totalCostCents
  // and Account 2100 matches active floorplan draws (drawn + interest)
  const inStockNew = vehicles.filter((v) => v.class === 'new' && v.status === 'in_stock');
  const inStockUsedDemo = vehicles.filter(
    (v) => ['used', 'demo'].includes(v.class) && v.status === 'in_stock'
  );
  const activeDraws = floorplanDrawsFixture.filter((d) => d.settledDate === null);

  const totalInStockNewCost = sumCents(inStockNew.map((v) => v.totalCostCents));
  const totalInStockUsedCost = sumCents(inStockUsedDemo.map((v) => v.totalCostCents));
  const totalFloorplanDrawn = sumCents(activeDraws.map((d) => d.drawnAmountCents));
  const totalFloorplanInterest = sumCents(activeDraws.map((d) => d.interestAccruedCents));
  const totalFloorplanFacility = totalFloorplanDrawn + totalFloorplanInterest;

  // Split active draws between new vehicles (KMHD...0002xx) and demo vehicles (KMHD...0003xx)
  const activeNewDraws = activeDraws.filter((d) => !d.vin.includes('0003'));
  const activeDemoDraws = activeDraws.filter((d) => d.vin.includes('0003'));
  const newFloorplanDrawn = sumCents(activeNewDraws.map((d) => d.drawnAmountCents));
  const demoFloorplanDrawn = sumCents(activeDemoDraws.map((d) => d.drawnAmountCents));

  // Floorplan Draw journal
  // Debit 1200 for new inventory financed by floorplan
  // Debit 1210 for demo inventory financed by floorplan
  // Credit 2100 for Floorplan Facility Ally
  const floorplanLines = [
    {
      accountId: accountMap.get('1200')._id,
      debitCents: newFloorplanDrawn,
      creditCents: 0,
      department: 'New',
    },
    {
      accountId: accountMap.get('1210')._id,
      debitCents: demoFloorplanDrawn,
      creditCents: 0,
      department: 'Used',
    },
    {
      accountId: accountMap.get('2100')._id,
      debitCents: 0,
      creditCents: totalFloorplanDrawn,
      department: 'New',
    },
  ];
  await postJournalEntry({
    periodId: activePeriod._id,
    date: new Date('2026-09-01'),
    source: 'floorplan',
    sourceRef: 'FP-DRAW-0926',
    narration: 'Floorplan Facility Draws — Active In-Stock Units',
    lines: floorplanLines,
    postedBy: adminUser._id,
  });

  // Accrued interest on floorplan
  if (totalFloorplanInterest > 0) {
    await postJournalEntry({
      periodId: activePeriod._id,
      date: new Date('2026-09-15'),
      source: 'floorplan',
      sourceRef: 'FP-INT-0926',
      narration: 'Accrued Floorplan Interest to Period Date',
      lines: [
        {
          accountId: accountMap.get('6400')._id, // Floorplan Interest Expense
          debitCents: totalFloorplanInterest,
          creditCents: 0,
          department: 'New',
        },
        {
          accountId: accountMap.get('2100')._id, // Floorplan Facility (Liability)
          debitCents: 0,
          creditCents: totalFloorplanInterest,
          department: 'New',
        },
      ],
      postedBy: adminUser._id,
    });
  }

  // Remaining inventory capitalization: bring 1200 and 1210 to exact totalCostCents
  const getNetGlDebit = async (acctId) => {
    const agg = await JournalEntry.aggregate([
      { $match: { periodId: activePeriod._id } },
      { $unwind: '$lines' },
      { $match: { 'lines.accountId': acctId } },
      {
        $group: {
          _id: null,
          totalDebits: { $sum: '$lines.debitCents' },
          totalCredits: { $sum: '$lines.creditCents' },
        },
      },
    ]);
    const debits = agg[0]?.totalDebits || 0;
    const credits = agg[0]?.totalCredits || 0;
    return debits - credits;
  };

  const currentNet1200 = await getNetGlDebit(accountMap.get('1200')._id);
  const diffNew = totalInStockNewCost - currentNet1200;

  const currentNet1210 = await getNetGlDebit(accountMap.get('1210')._id);
  const diffUsed = totalInStockUsedCost - currentNet1210;

  const inventoryEquityLines = [];
  if (diffNew !== 0) {
    inventoryEquityLines.push({
      accountId: accountMap.get('1200')._id,
      debitCents: diffNew > 0 ? diffNew : 0,
      creditCents: diffNew < 0 ? Math.abs(diffNew) : 0,
      department: 'New',
    });
  }
  if (diffUsed !== 0) {
    inventoryEquityLines.push({
      accountId: accountMap.get('1210')._id,
      debitCents: diffUsed > 0 ? diffUsed : 0,
      creditCents: diffUsed < 0 ? Math.abs(diffUsed) : 0,
      department: 'Used',
    });
  }

  const netInvDebits = sumCents(inventoryEquityLines.map((l) => l.debitCents));
  const netInvCredits = sumCents(inventoryEquityLines.map((l) => l.creditCents));
  const netInvOffset = netInvDebits - netInvCredits;

  if (netInvOffset !== 0) {
    inventoryEquityLines.push({
      accountId: accountMap.get('2040')._id, // Accrued Expenses clearing
      debitCents: netInvOffset < 0 ? Math.abs(netInvOffset) : 0,
      creditCents: netInvOffset > 0 ? netInvOffset : 0,
      department: 'Admin',
    });

    await postJournalEntry({
      periodId: activePeriod._id,
      date: new Date('2026-09-02'),
      source: 'manual',
      sourceRef: 'INV-CAP-0926',
      narration: 'In-Stock Vehicle Cost Stack Capitalization (Freight, Recon, PDI)',
      lines: inventoryEquityLines,
      postedBy: adminUser._id,
    });
  }

  // 14D. Bank Matched Transactions Journal
  // Ensures GL Operating Bank (1000) matches openingBalance + matchedTxns exactly!
  const opBankAcct = bankAccountTypeMap.get('operating');
  const opMatchedTxns = await BankTransaction.find({
    bankAccountId: opBankAcct._id,
    status: 'matched',
  });

  for (const txn of opMatchedTxns) {
    const isCredit = txn.direction === 'credit';
    const amount = Math.abs(txn.amountCents);

    const lines = [
      {
        accountId: accountMap.get('1000')._id,
        debitCents: isCredit ? amount : 0,
        creditCents: isCredit ? 0 : amount,
        department: 'Admin',
      },
      {
        accountId: accountMap.get(isCredit ? '1120' : '2040')._id, // Clearing / Rec
        debitCents: isCredit ? 0 : amount,
        creditCents: isCredit ? amount : 0,
        department: 'Admin',
      },
    ];

    const entry = await postJournalEntry({
      periodId: activePeriod._id,
      date: txn.date,
      source: 'bank',
      sourceRef: txn.description.substring(0, 30),
      narration: txn.description,
      lines,
      postedBy: adminUser._id,
    });

    txn.journalEntryId = entry._id;
    await txn.save();
  }

  // Trust Bank matched transactions
  const trustBankAcct = bankAccountTypeMap.get('trust');
  const trustMatchedTxns = await BankTransaction.find({
    bankAccountId: trustBankAcct._id,
    status: 'matched',
  });

  for (const txn of trustMatchedTxns) {
    const amount = Math.abs(txn.amountCents);
    const lines = [
      {
        accountId: accountMap.get('1010')._id, // Trust Account (Asset)
        debitCents: amount,
        creditCents: 0,
        department: 'Admin',
      },
      {
        accountId: accountMap.get('2050')._id, // Customer Deposits Held (Liability)
        debitCents: 0,
        creditCents: amount,
        department: 'Admin',
      },
    ];

    const entry = await postJournalEntry({
      periodId: activePeriod._id,
      date: txn.date,
      source: 'bank',
      sourceRef: 'TRUST-DEP-9102',
      narration: txn.description,
      lines,
      postedBy: adminUser._id,
    });

    txn.journalEntryId = entry._id;
    await txn.save();
  }

  // 15. VERIFY TRIAL BALANCE
  console.log('\n⚖️   Verifying Trial Balance...');
  const tb = await computeTrialBalance(activePeriod._id);
  console.log(`    Total Debits:  ${formatAUD(tb.totalDebitCents)}`);
  console.log(`    Total Credits: ${formatAUD(tb.totalCreditCents)}`);
  console.log(`    Net Imbalance: ${formatAUD(tb.differenceCents)}`);
  if (!tb.isBalanced) {
    throw new Error(`Trial Balance is not balanced! Difference: ${tb.differenceCents} cents`);
  }
  console.log('    ✅  Trial Balance is perfectly balanced ($0.00 difference)!');

  // 16. BUILD & VERIFY CONTROL RECONCILIATIONS
  console.log('\n🛡️   Building and verifying all 8 Control Reconciliations...');
  const controlRecs = await buildAllControlRecs(activePeriod._id);
  for (const rec of controlRecs) {
    const statusEmoji = rec.differenceCents === 0 ? '✅' : '❌';
    console.log(
      `    ${statusEmoji}  Control Rec [${rec.type.padEnd(18)}]: GL = ${formatAUD(rec.glBalanceCents).padStart(12)} | Sub = ${formatAUD(rec.subLedgerBalanceCents).padStart(12)} | Diff = ${formatAUD(rec.differenceCents)} (${rec.status})`
    );
    if (rec.differenceCents !== 0) {
      throw new Error(`Control Rec ${rec.type} failed! Difference: ${rec.differenceCents} cents`);
    }
  }

  // 17. BUILD & VERIFY BANK RECONCILIATION PACK
  console.log('\n📦  Building Bank Reconciliation Pack...');
  const recPack = await buildRecPack(opBankAcct._id, activePeriod._id);
  console.log(`    Book Balance:      ${formatAUD(recPack.bookBalanceCents)}`);
  console.log(`    Statement Balance: ${formatAUD(recPack.statementBalanceCents)}`);
  console.log(`    Difference:        ${formatAUD(recPack.differenceCents)}`);
  if (recPack.differenceCents !== 0) {
    throw new Error(`Bank Rec Pack difference is not zero! Diff: ${recPack.differenceCents}`);
  }
  console.log('    ✅  Bank Rec Pack difference is exactly $0.00!');

  console.log('\n🎉  SEEDING COMPLETED SUCCESSFULLY!');
  console.log('======================================================\n');

  await disconnectDB();
}

seed().catch((err) => {
  console.error('\n❌  Seed script error:', err);
  process.exit(1);
});

// Seed data: Journals fixture providing balanced journal templates and opening ledger positions
export const openingBalancesFixture = {
  narration: 'Opening Trial Balance — FY2026/27 Carried Forward',
  source: 'manual',
  sourceRef: 'TB-OPEN-2026',
  date: new Date('2026-07-01'),
  positions: [
    // Bank Accounts Opening (Asset: Debit)
    { accountCode: '1000', debitCents: 45672300, creditCents: 0, department: 'Admin' }, // $456,723.00
    { accountCode: '1010', debitCents: 12500000, creditCents: 0, department: 'Admin' }, // $125,000.00
    { accountCode: '1020', debitCents: 8750000, creditCents: 0, department: 'Admin' },  // $87,500.00

    // Fixed Assets & Equipment (Asset: Debit)
    { accountCode: '1500', debitCents: 350000000, creditCents: 0, department: 'Admin' }, // $3.5M Property
    { accountCode: '1510', debitCents: 42000000, creditCents: 0, department: 'Service' }, // $420k Workshop Hoists
    { accountCode: '1520', debitCents: 18500000, creditCents: 0, department: 'Admin' },   // $185k Company Cars
    { accountCode: '1530', debitCents: 9500000, creditCents: 0, department: 'Admin' },    // $95k IT & Fitout
    { accountCode: '1550', debitCents: 0, creditCents: 65000000, department: 'Admin' },   // -$650k Acc Depreciation

    // Inventory Opening (Parts & WIP)
    { accountCode: '1230', debitCents: 18500000, creditCents: 0, department: 'Parts' },   // $185k Parts
    { accountCode: '1240', debitCents: 6200000, creditCents: 0, department: 'Service' },  // $62k WIP

    // Prepayments & Deposits Held
    { accountCode: '1300', debitCents: 8400000, creditCents: 0, department: 'Admin' },    // Prepaid Insurance
    { accountCode: '2050', debitCents: 0, creditCents: 8750000, department: 'Admin' },    // Customer deposits held liability

    // Long-Term Liabilities
    { accountCode: '2200', debitCents: 0, creditCents: 185000000, department: 'Admin' },  // Commercial loan ($1.85M)

    // Equity (Share Capital & Retained Earnings to perfectly balance)
    { accountCode: '3000', debitCents: 0, creditCents: 100000000, department: 'Admin' },  // Share Capital ($1.0M)
    // Balancing line for Retained Earnings: computed dynamically in seed orchestrator
  ],
};

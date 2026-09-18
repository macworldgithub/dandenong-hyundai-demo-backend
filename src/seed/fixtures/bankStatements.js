// Seed data: Bank Statements & Transactions for NAB Operating and Trust accounts
export const bankStatementsFixture = [
  // ═══════ NAB OPERATING ACCOUNT (1000) — SEPTEMBER 2026 ═══════
  {
    bankAccountType: 'operating',
    periodCode: '2026-09',
    fileName: 'NAB_Operating_20260930.csv',
    openingBalanceCents: 45672300, // $456,723.00
    // Total net movement = +$196,582.00
    closingBalanceCents: 65330500, // $653,305.00
    transactions: [
      // ─── Matched Customer Deal Receipts / Financier Payouts ───
      {
        date: new Date('2026-09-02'),
        description: 'EFT HYUNDAI CAPITAL FIN SETTLEMENT D-2026-005',
        amountCents: 3149000,
        direction: 'credit',
        status: 'matched',
        matchConfidence: 0.99,
        matchType: 'deal_payout',
        allocations: [{ amountCents: 3149000, dealNumber: 'D-2026-005', note: 'Deal settlement' }],
      },
      {
        date: new Date('2026-09-03'),
        description: 'DEPOSIT MACQUARIE AUTO SETTLEMENT D-2026-020',
        amountCents: 4999000,
        direction: 'credit',
        status: 'matched',
        matchConfidence: 0.98,
        matchType: 'deal_payout',
        allocations: [{ amountCents: 4999000, dealNumber: 'D-2026-020', note: 'Used BMW settlement' }],
      },
      {
        date: new Date('2026-09-05'),
        description: 'DIRECT CREDIT HYUNDAI CAP SETTLEMENT D-2026-006',
        amountCents: 6299000,
        direction: 'credit',
        status: 'matched',
        matchConfidence: 0.99,
        matchType: 'deal_payout',
        allocations: [{ amountCents: 6299000, dealNumber: 'D-2026-006', note: 'Kona EV settlement' }],
      },
      {
        date: new Date('2026-09-07'),
        description: 'NAB MERCHANT SETTLEMENT SERVICE DEPT',
        amountCents: 1452000,
        direction: 'credit',
        status: 'matched',
        matchConfidence: 0.95,
        matchType: 'merchant_settlement',
        allocations: [{ amountCents: 1452000, accountCode: '4200', note: 'Service revenue clearing' }],
      },
      {
        date: new Date('2026-09-08'),
        description: 'DIRECT CREDIT HYUNDAI CAP SETTLEMENT D-2026-007',
        amountCents: 5199000,
        direction: 'credit',
        status: 'matched',
        matchConfidence: 0.99,
        matchType: 'deal_payout',
        allocations: [{ amountCents: 5199000, dealNumber: 'D-2026-007', note: 'Santa Fe settlement' }],
      },
      {
        date: new Date('2026-09-10'),
        description: 'DIRECT CREDIT HYUNDAI CAP SETTLEMENT D-2026-008',
        amountCents: 6899000,
        direction: 'credit',
        status: 'matched',
        matchConfidence: 0.99,
        matchType: 'deal_payout',
        allocations: [{ amountCents: 6899000, dealNumber: 'D-2026-008', note: 'Calligraphy settlement' }],
      },
      {
        date: new Date('2026-09-12'),
        description: 'NAB MERCHANT SETTLEMENT PARTS DEPT',
        amountCents: 985000,
        direction: 'credit',
        status: 'matched',
        matchConfidence: 0.94,
        matchType: 'merchant_settlement',
        allocations: [{ amountCents: 985000, accountCode: '4300', note: 'Parts counter clearing' }],
      },

      // ─── Matched AP Payments & Overhead ───
      {
        date: new Date('2026-09-04'),
        description: 'EFT PAYMENT SOUTHSIDE AUTO TRANSPORT SAT-99201',
        amountCents: -98450,
        direction: 'debit',
        status: 'matched',
        matchConfidence: 0.99,
        matchType: 'ap_invoice',
        allocations: [{ amountCents: -98450, supplierName: 'Southside Auto Transport', note: 'Freight' }],
      },
      {
        date: new Date('2026-09-05'),
        description: 'EFT PAYMENT METRO VEHICLE LOGISTICS MVL-44101',
        amountCents: -98450,
        direction: 'debit',
        status: 'matched',
        matchConfidence: 0.99,
        matchType: 'ap_invoice',
        allocations: [{ amountCents: -98450, supplierName: 'Metro Vehicle Logistics', note: 'Transport' }],
      },
      {
        date: new Date('2026-09-07'),
        description: 'EFT PAYMENT AUTOGLAZE PAINT PROTECTION AGP-3101',
        amountCents: -137500,
        direction: 'debit',
        status: 'matched',
        matchConfidence: 0.99,
        matchType: 'ap_invoice',
        allocations: [{ amountCents: -137500, supplierName: 'AutoGlaze Paint Protection', note: 'Paint pack' }],
      },
      {
        date: new Date('2026-09-10'),
        description: 'DIRECT DEBIT AGL ENERGY ELECTRICITY AGL-AUG-26',
        amountCents: -563200,
        direction: 'debit',
        status: 'matched',
        matchConfidence: 0.99,
        matchType: 'ap_invoice',
        allocations: [{ amountCents: -563200, supplierName: 'AGL Energy', note: 'Power bill' }],
      },
      {
        date: new Date('2026-09-11'),
        description: 'DIRECT DEBIT TELSTRA BUSINESS TLS-AUG-26',
        amountCents: -189200,
        direction: 'debit',
        status: 'matched',
        matchConfidence: 0.99,
        matchType: 'ap_invoice',
        allocations: [{ amountCents: -189200, supplierName: 'Telstra Business', note: 'Comms' }],
      },
      {
        date: new Date('2026-09-14'),
        description: 'EFT PAYMENT REA GROUP CARSALES REA-AUG-26',
        amountCents: -935000,
        direction: 'debit',
        status: 'matched',
        matchConfidence: 0.99,
        matchType: 'ap_invoice',
        allocations: [{ amountCents: -935000, supplierName: 'REA Group (carsales.com.au)', note: 'Advertising' }],
      },
      {
        date: new Date('2026-09-15'),
        description: 'PAYROLL FORTNIGHT ENDING 15/09/2026',
        amountCents: -18450000,
        direction: 'debit',
        status: 'matched',
        matchConfidence: 0.95,
        matchType: 'payroll',
        allocations: [{ amountCents: -18450000, accountCode: '6200', note: 'Fortnightly salaries' }],
      },

      // ─── Suggested Match Item (Ready for 1-click match in Bank Desk) ───
      {
        date: new Date('2026-09-15'),
        description: 'HMCA BONUS Q3 TARGET ATTAINMENT REBATE',
        amountCents: 3500000,
        direction: 'credit',
        status: 'suggested',
        matchConfidence: 0.92,
        matchType: 'oem_bonus',
        allocations: [],
      },

      // ─── Split Candidate Item (Financier payout requiring multi-deal split) ───
      {
        date: new Date('2026-09-16'),
        description: 'MACQUARIE BULK DEAL DISBURSEMENT 88391',
        amountCents: 7398000,
        direction: 'credit',
        status: 'suggested',
        matchConfidence: 0.88,
        matchType: 'split_payout',
        allocations: [],
      },

      // ─── Unmatched Item (Outstanding Deposit) ───
      {
        date: new Date('2026-09-17'),
        description: 'DIRECT DEPOSIT OVER THE COUNTER REF 99014',
        amountCents: 500000,
        direction: 'credit',
        status: 'unmatched',
        matchConfidence: 0.45,
        allocations: [],
      },

      // ─── Parked Item (Investigation Item for Controller) ───
      {
        date: new Date('2026-09-17'),
        description: 'UNKNOWN DISBURSEMENT CHQ #004491 UNIDENTIFIED',
        amountCents: -250000,
        direction: 'debit',
        status: 'parked',
        matchConfidence: 0.10,
        allocations: [],
      },
    ],
  },

  // ═══════ NAB TRUST ACCOUNT (1010) — SEPTEMBER 2026 ═══════
  {
    bankAccountType: 'trust',
    periodCode: '2026-09',
    fileName: 'NAB_Trust_20260930.csv',
    openingBalanceCents: 12500000, // $125,000.00
    closingBalanceCents: 14500000, // $145,000.00
    transactions: [
      {
        date: new Date('2026-09-04'),
        description: 'TRUST DEPOSIT FLEET HOLDING GOVT ORDER #9102',
        amountCents: 2000000,
        direction: 'credit',
        status: 'matched',
        matchConfidence: 0.99,
        matchType: 'trust_holding',
        allocations: [{ amountCents: 2000000, accountCode: '2050', note: 'Fleet trust deposit' }],
      },
    ],
  },
];

// Seed data: Full Chart of Accounts with departments and control flags
// Departments: New, Used, Service, Parts, F&I, Admin
export const accountsFixture = [
  // ═══════ ASSETS (1xxx) ═══════
  // Cash & Bank
  { code: '1000', name: 'Operating Bank Account', type: 'asset', department: 'Admin', isControl: true, controlFor: 'cash_operating' },
  { code: '1010', name: 'Trust Account', type: 'asset', department: 'Admin', isControl: true, controlFor: 'cash_trust' },
  { code: '1020', name: 'Customer Deposits Account', type: 'asset', department: 'Admin', isControl: true, controlFor: 'customer_deposits' },

  // Receivables
  { code: '1100', name: 'Accounts Receivable — Trade', type: 'asset', department: 'Admin' },
  { code: '1110', name: 'Accounts Receivable — OEM', type: 'asset', department: 'Admin' },
  { code: '1120', name: 'Accounts Receivable — Finance', type: 'asset', department: 'Admin' },
  { code: '1150', name: 'GST Receivable', type: 'asset', department: 'Admin', isControl: true, controlFor: 'gst' },

  // Inventory
  { code: '1200', name: 'Inventory — New Vehicles', type: 'asset', department: 'New', isControl: true, controlFor: 'inventory_new' },
  { code: '1210', name: 'Inventory — Used Vehicles', type: 'asset', department: 'Used', isControl: true, controlFor: 'inventory_used' },
  { code: '1220', name: 'Inventory — Demo Vehicles', type: 'asset', department: 'New', isControl: true, controlFor: 'inventory_demo' },
  { code: '1230', name: 'Inventory — Parts', type: 'asset', department: 'Parts' },
  { code: '1240', name: 'Inventory — Work In Progress', type: 'asset', department: 'Service' },

  // Prepayments
  { code: '1300', name: 'Prepaid Insurance', type: 'asset', department: 'Admin' },
  { code: '1310', name: 'Prepaid Advertising', type: 'asset', department: 'Admin' },

  // Fixed Assets
  { code: '1500', name: 'Land & Buildings', type: 'asset', department: 'Admin' },
  { code: '1510', name: 'Plant & Equipment', type: 'asset', department: 'Service' },
  { code: '1520', name: 'Motor Vehicles (Business)', type: 'asset', department: 'Admin' },
  { code: '1530', name: 'Office Equipment', type: 'asset', department: 'Admin' },
  { code: '1550', name: 'Accumulated Depreciation', type: 'asset', department: 'Admin' },

  // ═══════ LIABILITIES (2xxx) ═══════
  { code: '2000', name: 'Accounts Payable — Trade', type: 'liability', department: 'Admin', isControl: true, controlFor: 'ap' },
  { code: '2010', name: 'GST Payable', type: 'liability', department: 'Admin' },
  { code: '2020', name: 'PAYG Withholding', type: 'liability', department: 'Admin' },
  { code: '2030', name: 'Superannuation Payable', type: 'liability', department: 'Admin' },
  { code: '2040', name: 'Accrued Expenses', type: 'liability', department: 'Admin' },
  { code: '2050', name: 'Customer Deposits Held', type: 'liability', department: 'Admin' },
  { code: '2100', name: 'Floorplan Facility — Ally', type: 'liability', department: 'New', isControl: true, controlFor: 'floorplan' },
  { code: '2110', name: 'Floorplan Facility — Macquarie', type: 'liability', department: 'Used' },
  { code: '2200', name: 'Bank Loan', type: 'liability', department: 'Admin' },
  { code: '2300', name: 'Hire Purchase', type: 'liability', department: 'Admin' },

  // ═══════ EQUITY (3xxx) ═══════
  { code: '3000', name: 'Share Capital', type: 'equity', department: 'Admin' },
  { code: '3100', name: 'Retained Earnings', type: 'equity', department: 'Admin' },
  { code: '3200', name: 'Current Year Profit', type: 'equity', department: 'Admin' },

  // ═══════ REVENUE (4xxx) ═══════
  // New vehicle revenue
  { code: '4000', name: 'Sales — New Vehicles', type: 'revenue', department: 'New' },
  { code: '4010', name: 'Holdback Income — New', type: 'revenue', department: 'New' },
  { code: '4020', name: 'OEM Bonus — New', type: 'revenue', department: 'New' },

  // Used vehicle revenue
  { code: '4100', name: 'Sales — Used Vehicles', type: 'revenue', department: 'Used' },
  { code: '4110', name: 'Trade Profit', type: 'revenue', department: 'Used' },

  // F&I revenue
  { code: '4200', name: 'F&I — Finance Commission', type: 'revenue', department: 'F&I' },
  { code: '4210', name: 'F&I — Insurance', type: 'revenue', department: 'F&I' },
  { code: '4220', name: 'F&I — Extended Warranty', type: 'revenue', department: 'F&I' },
  { code: '4230', name: 'F&I — Paint Protection', type: 'revenue', department: 'F&I' },

  // Service revenue
  { code: '4300', name: 'Service Labour Revenue', type: 'revenue', department: 'Service' },
  { code: '4310', name: 'Service Sublet Revenue', type: 'revenue', department: 'Service' },
  { code: '4320', name: 'Warranty Labour Revenue', type: 'revenue', department: 'Service' },

  // Parts revenue
  { code: '4400', name: 'Parts Sales — Counter', type: 'revenue', department: 'Parts' },
  { code: '4410', name: 'Parts Sales — Workshop', type: 'revenue', department: 'Parts' },
  { code: '4420', name: 'Parts Sales — Wholesale', type: 'revenue', department: 'Parts' },

  // Other revenue
  { code: '4500', name: 'Documentation Fees', type: 'revenue', department: 'Admin' },
  { code: '4510', name: 'Interest Income', type: 'revenue', department: 'Admin' },

  // ═══════ COST OF SALES (5xxx) ═══════
  { code: '5000', name: 'COGS — New Vehicles', type: 'expense', department: 'New' },
  { code: '5010', name: 'Vehicle Recon — New', type: 'expense', department: 'New' },
  { code: '5020', name: 'PDI Costs — New', type: 'expense', department: 'New' },

  { code: '5100', name: 'COGS — Used Vehicles', type: 'expense', department: 'Used' },
  { code: '5110', name: 'Vehicle Recon — Used', type: 'expense', department: 'Used' },
  { code: '5120', name: 'Transport Costs — Used', type: 'expense', department: 'Used' },

  { code: '5200', name: 'COGS — Parts', type: 'expense', department: 'Parts' },
  { code: '5300', name: 'Service Technician Wages', type: 'expense', department: 'Service' },
  { code: '5310', name: 'Service Sublet Costs', type: 'expense', department: 'Service' },

  // ═══════ OPERATING EXPENSES (6xxx–7xxx) ═══════
  { code: '6000', name: 'Salaries & Wages — Sales', type: 'expense', department: 'New' },
  { code: '6010', name: 'Commissions — Sales', type: 'expense', department: 'New' },
  { code: '6020', name: 'Sales Incentives', type: 'expense', department: 'New' },

  { code: '6100', name: 'Salaries & Wages — Admin', type: 'expense', department: 'Admin' },
  { code: '6110', name: 'Superannuation', type: 'expense', department: 'Admin' },
  { code: '6120', name: 'Workers Compensation', type: 'expense', department: 'Admin' },

  { code: '6200', name: 'Rent & Occupancy', type: 'expense', department: 'Admin' },
  { code: '6210', name: 'Utilities', type: 'expense', department: 'Admin' },
  { code: '6220', name: 'Insurance', type: 'expense', department: 'Admin' },
  { code: '6230', name: 'Repairs & Maintenance', type: 'expense', department: 'Admin' },

  { code: '6300', name: 'Advertising & Marketing', type: 'expense', department: 'Admin' },
  { code: '6310', name: 'Digital Marketing', type: 'expense', department: 'Admin' },

  { code: '6400', name: 'IT & Software', type: 'expense', department: 'Admin' },
  { code: '6410', name: 'Telephone & Internet', type: 'expense', department: 'Admin' },

  { code: '6500', name: 'Depreciation', type: 'expense', department: 'Admin' },
  { code: '6510', name: 'Amortisation', type: 'expense', department: 'Admin' },

  { code: '7000', name: 'Floorplan Interest — New', type: 'expense', department: 'New' },
  { code: '7010', name: 'Floorplan Interest — Used', type: 'expense', department: 'Used' },
  { code: '7020', name: 'Bank Charges & Fees', type: 'expense', department: 'Admin' },
  { code: '7030', name: 'Interest Expense — Loan', type: 'expense', department: 'Admin' },

  { code: '7100', name: 'Professional Fees — Accounting', type: 'expense', department: 'Admin' },
  { code: '7110', name: 'Professional Fees — Legal', type: 'expense', department: 'Admin' },
  { code: '7120', name: 'Audit Fees', type: 'expense', department: 'Admin' },

  { code: '7200', name: 'Training & Development', type: 'expense', department: 'Admin' },
  { code: '7210', name: 'Travel & Entertainment', type: 'expense', department: 'Admin' },
  { code: '7300', name: 'Sundry Expenses', type: 'expense', department: 'Admin' },
];

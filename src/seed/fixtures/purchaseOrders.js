// Seed data: Purchase Orders for 3-way matching and cost stack verification (Dandenong Hyundai)
export const purchaseOrdersFixture = [
  // ─── POs for Delivered New Vehicles (HMCA) ───
  {
    poNumber: 'PO-2026-0801',
    supplierName: 'Hyundai Motor Company Australia',
    vin: 'DANEFD993A97EC04C', // Stock HY372
    lines: [{ description: 'Hyundai i30 Hatch Active 1.8P Auto', quantity: 1, unitPriceCents: 2159091, totalCents: 2159091, accountCode: '1200' }],
    subtotalCents: 2159091,
    gstCents: 215909,
    grossCents: 2375000,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-0802',
    supplierName: 'Hyundai Motor Company Australia',
    vin: 'DAN5416C38C1E2874', // Stock HY3446
    lines: [{ description: 'Hyundai i30 Hatch Active 2.0P Auto', quantity: 1, unitPriceCents: 2196533, totalCents: 2196533, accountCode: '1200' }],
    subtotalCents: 2196533,
    gstCents: 219653,
    grossCents: 2416186,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-0803',
    supplierName: 'Hyundai Motor Company Australia',
    vin: 'DAN068DBFB246CA08', // Stock 320436281
    lines: [{ description: 'Hyundai i30 Hatch N Line MHEV 1.5T DCT', quantity: 1, unitPriceCents: 3315217, totalCents: 3315217, accountCode: '1200' }],
    subtotalCents: 3315217,
    gstCents: 331522,
    grossCents: 3646739,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-0804',
    supplierName: 'Hyundai Motor Company Australia',
    vin: 'DAN67D121F0BA02D3', // Stock 320451622
    lines: [{ description: 'Hyundai Kona HEV Premium 1.6P DCT', quantity: 1, unitPriceCents: 4008636, totalCents: 4008636, accountCode: '1200' }],
    subtotalCents: 4008636,
    gstCents: 400864,
    grossCents: 4409500,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-0805',
    supplierName: 'Hyundai Motor Company Australia',
    vin: 'DAN56434B9E4C98F6', // Stock 320462841
    lines: [{ description: 'Hyundai Venue Active 1.6P Auto', quantity: 1, unitPriceCents: 2477272, totalCents: 2477272, accountCode: '1200' }],
    subtotalCents: 2477272,
    gstCents: 247727,
    grossCents: 2724999,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-0806',
    supplierName: 'Hyundai Motor Company Australia',
    vin: 'DAN1ED9E302B089E0', // Stock 320466207
    lines: [{ description: 'Hyundai Staria Load 2S 2.2D TSWING AT', quantity: 1, unitPriceCents: 5960924, totalCents: 5960924, accountCode: '1200' }],
    subtotalCents: 5960924,
    gstCents: 596092,
    grossCents: 6557016,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-0807',
    supplierName: 'Hyundai Motor Company Australia',
    vin: 'DANFC86B0D311F3BE', // Stock 320470330
    lines: [{ description: 'Hyundai Santa Fe Calligraphy 2.5T AWD', quantity: 1, unitPriceCents: 6826669, totalCents: 6826669, accountCode: '1200' }],
    subtotalCents: 6826669,
    gstCents: 682667,
    grossCents: 7509336,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-0808',
    supplierName: 'Hyundai Motor Company Australia',
    vin: 'DANF3A7C749A16BC4', // Stock 320461551
    lines: [{ description: 'Hyundai Palisade Calligraphy 2.5T HEV AT AWD', quantity: 1, unitPriceCents: 8094025, totalCents: 8094025, accountCode: '1200' }],
    subtotalCents: 8094025,
    gstCents: 809403,
    grossCents: 8903428,
    status: 'received',
  },

  // ─── POs for In-Stock Vehicles (HMCA) ───
  {
    poNumber: 'PO-2026-0901',
    supplierName: 'Hyundai Motor Company Australia',
    vin: 'DANC53D109E74691C', // Stock 320386768
    lines: [{ description: 'Hyundai Staria Load 2S 2.2D Liftback Auto', quantity: 1, unitPriceCents: 4203636, totalCents: 4203636, accountCode: '1200' }],
    subtotalCents: 4203636,
    gstCents: 420364,
    grossCents: 4624000,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-0902',
    supplierName: 'Hyundai Motor Company Australia',
    vin: 'DAN9D11FD471479EE', // Stock 320451082
    lines: [{ description: 'Hyundai Venue Active 1.6P Auto', quantity: 1, unitPriceCents: 2513030, totalCents: 2513030, accountCode: '1200' }],
    subtotalCents: 2513030,
    gstCents: 251303,
    grossCents: 2764333,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-0903',
    supplierName: 'Hyundai Motor Company Australia',
    vin: 'DAN0BA7CDAA716DE0', // Stock 320469343
    lines: [{ description: 'Hyundai Kona 2.0P CVT', quantity: 1, unitPriceCents: 3063636, totalCents: 3063636, accountCode: '1200' }],
    subtotalCents: 3063636,
    gstCents: 306364,
    grossCents: 3370000,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-0904',
    supplierName: 'Hyundai Motor Company Australia',
    vin: 'DAN8EED9DF21FD2FB', // Stock 320460405
    lines: [{ description: 'Hyundai Staria 8S 3.5P Auto', quantity: 1, unitPriceCents: 4639944, totalCents: 4639944, accountCode: '1200' }],
    subtotalCents: 4639944,
    gstCents: 463994,
    grossCents: 5103938,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-0905',
    supplierName: 'Hyundai Motor Company Australia',
    vin: 'DANEF5B71C54460EB', // Stock 320462468
    lines: [{ description: 'Hyundai Palisade 8S Calligraphy 2.5T HEV AWD', quantity: 1, unitPriceCents: 8329191, totalCents: 8329191, accountCode: '1200' }],
    subtotalCents: 8329191,
    gstCents: 832919,
    grossCents: 9162110,
    status: 'received',
  },

  // ─── POs for Transport / Recon / Accessories ───
  {
    poNumber: 'PO-2026-TR01',
    supplierName: 'Southside Auto Transport',
    vin: 'DANC53D109E74691C', // Staria Load 320386768
    lines: [{ description: 'Port to Dealership Freight Staria Load #320386768', quantity: 1, unitPriceCents: 89500, totalCents: 89500, accountCode: '1200' }],
    subtotalCents: 89500,
    gstCents: 8950,
    grossCents: 98450,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-TR02',
    supplierName: 'Metro Vehicle Logistics',
    vin: 'DAN9D11FD471479EE', // Venue 320451082
    lines: [{ description: 'Port to Dealership Freight Venue #320451082', quantity: 1, unitPriceCents: 89500, totalCents: 89500, accountCode: '1200' }],
    subtotalCents: 89500,
    gstCents: 8950,
    grossCents: 98450,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-REC01',
    supplierName: 'Prestige Auto Detailing',
    vin: 'DANB666A20773D442', // Tucson S5009135
    lines: [{ description: 'Full Recon & Polish Tucson Elite (Stock S5009135)', quantity: 1, unitPriceCents: 145000, totalCents: 145000, accountCode: '1210' }],
    subtotalCents: 145000,
    gstCents: 14500,
    grossCents: 159500,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-REC02',
    supplierName: 'SmartRepair Panel & Paint',
    vin: 'DANAF0CFA05C9CA23', // i30 S5021808
    lines: [{ description: 'Bumper touchup & blend i30 N Line (Stock S5021808)', quantity: 1, unitPriceCents: 85000, totalCents: 85000, accountCode: '1210' }],
    subtotalCents: 85000,
    gstCents: 8500,
    grossCents: 93500,
    status: 'received',
  },
  {
    poNumber: 'PO-2026-REC03',
    supplierName: 'SmartRepair Panel & Paint',
    vin: 'DAN8ADB36A070774A', // Santa Fe S5014760
    lines: [{ description: 'Dent repair & blend Santa Fe Hybrid (Stock S5014760)', quantity: 1, unitPriceCents: 195000, totalCents: 195000, accountCode: '1210' }],
    subtotalCents: 195000,
    gstCents: 19500,
    grossCents: 214500,
    status: 'received',
  },

  // ─── POs for Workshop & Parts ───
  {
    poNumber: 'PO-2026-PARTS01',
    supplierName: 'Hyundai Motor Company (Parts)',
    lines: [
      { description: 'OEM Oil Filters 50pk', quantity: 1, unitPriceCents: 280000, totalCents: 280000, accountCode: '1230' },
      { description: 'OEM Brake Pad Sets x10', quantity: 10, unitPriceCents: 11000, totalCents: 110000, accountCode: '1230' },
    ],
    subtotalCents: 390000,
    gstCents: 39000,
    grossCents: 429000,
    status: 'open',
  },
  {
    poNumber: 'PO-2026-PARTS02',
    supplierName: 'Repco Commercial',
    lines: [{ description: 'Workshop consumables bulk order', quantity: 1, unitPriceCents: 178000, totalCents: 178000, accountCode: '5220' }],
    subtotalCents: 178000,
    gstCents: 17800,
    grossCents: 195800,
    status: 'open',
  },
];

// Seed data: 40 vehicles — 25 delivered + 15 in stock
export const vehiclesFixture = [
  // ═══════ NEW VEHICLES — DELIVERED (15) ═══════
  { vin: 'KMHD841CBRU000101', stockNumber: 'N001', make: 'Hyundai', model: 'i30', variant: 'Active', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 2450000, sourceDocRef: 'HMCA-INV-2201' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-001' },
      { type: 'pdi', amountCents: 45000, sourceDocRef: 'PDI-001' },
      { type: 'holdback', amountCents: -185000, sourceDocRef: 'HB-001' },
    ]},
  { vin: 'KMHD841CBRU000102', stockNumber: 'N002', make: 'Hyundai', model: 'i30', variant: 'Elite', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 2890000, sourceDocRef: 'HMCA-INV-2202' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-002' },
      { type: 'pdi', amountCents: 45000, sourceDocRef: 'PDI-002' },
      { type: 'holdback', amountCents: -210000, sourceDocRef: 'HB-002' },
    ]},
  { vin: 'KMHD841CBRU000103', stockNumber: 'N003', make: 'Hyundai', model: 'Tucson', variant: 'Active', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 3250000, sourceDocRef: 'HMCA-INV-2203' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-003' },
      { type: 'pdi', amountCents: 55000, sourceDocRef: 'PDI-003' },
      { type: 'holdback', amountCents: -240000, sourceDocRef: 'HB-003' },
    ]},
  { vin: 'KMHD841CBRU000104', stockNumber: 'N004', make: 'Hyundai', model: 'Tucson', variant: 'Highlander', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 4120000, sourceDocRef: 'HMCA-INV-2204' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-004' },
      { type: 'pdi', amountCents: 55000, sourceDocRef: 'PDI-004' },
      { type: 'holdback', amountCents: -305000, sourceDocRef: 'HB-004' },
      { type: 'accessories', amountCents: 125000, sourceDocRef: 'ACC-004' },
    ]},
  { vin: 'KMHD841CBRU000105', stockNumber: 'N005', make: 'Hyundai', model: 'Kona', variant: 'Active', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 2650000, sourceDocRef: 'HMCA-INV-2205' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-005' },
      { type: 'pdi', amountCents: 45000, sourceDocRef: 'PDI-005' },
      { type: 'holdback', amountCents: -195000, sourceDocRef: 'HB-005' },
    ]},
  { vin: 'KMHD841CBRU000106', stockNumber: 'N006', make: 'Hyundai', model: 'Kona Electric', variant: 'Elite', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 5480000, sourceDocRef: 'HMCA-INV-2206' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-006' },
      { type: 'pdi', amountCents: 65000, sourceDocRef: 'PDI-006' },
      { type: 'holdback', amountCents: -410000, sourceDocRef: 'HB-006' },
    ]},
  { vin: 'KMHD841CBRU000107', stockNumber: 'N007', make: 'Hyundai', model: 'Santa Fe', variant: 'Active', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 4350000, sourceDocRef: 'HMCA-INV-2207' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-007' },
      { type: 'pdi', amountCents: 55000, sourceDocRef: 'PDI-007' },
      { type: 'holdback', amountCents: -320000, sourceDocRef: 'HB-007' },
    ]},
  { vin: 'KMHD841CBRU000108', stockNumber: 'N008', make: 'Hyundai', model: 'Santa Fe', variant: 'Calligraphy', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 5850000, sourceDocRef: 'HMCA-INV-2208' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-008' },
      { type: 'pdi', amountCents: 65000, sourceDocRef: 'PDI-008' },
      { type: 'holdback', amountCents: -435000, sourceDocRef: 'HB-008' },
      { type: 'accessories', amountCents: 210000, sourceDocRef: 'ACC-008' },
    ]},
  { vin: 'KMHD841CBRU000109', stockNumber: 'N009', make: 'Hyundai', model: 'i30 N', variant: 'Performance', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 4450000, sourceDocRef: 'HMCA-INV-2209' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-009' },
      { type: 'pdi', amountCents: 55000, sourceDocRef: 'PDI-009' },
      { type: 'holdback', amountCents: -330000, sourceDocRef: 'HB-009' },
    ]},
  { vin: 'KMHD841CBRU000110', stockNumber: 'N010', make: 'Hyundai', model: 'IONIQ 5', variant: 'Dynamiq', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 5280000, sourceDocRef: 'HMCA-INV-2210' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-010' },
      { type: 'pdi', amountCents: 65000, sourceDocRef: 'PDI-010' },
      { type: 'holdback', amountCents: -395000, sourceDocRef: 'HB-010' },
    ]},
  { vin: 'KMHD841CBRU000111', stockNumber: 'N011', make: 'Hyundai', model: 'IONIQ 6', variant: 'Epiq', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 5690000, sourceDocRef: 'HMCA-INV-2211' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-011' },
      { type: 'pdi', amountCents: 65000, sourceDocRef: 'PDI-011' },
      { type: 'holdback', amountCents: -425000, sourceDocRef: 'HB-011' },
    ]},
  { vin: 'KMHD841CBRU000112', stockNumber: 'N012', make: 'Hyundai', model: 'Palisade', variant: 'Highlander', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 6120000, sourceDocRef: 'HMCA-INV-2212' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-012' },
      { type: 'pdi', amountCents: 65000, sourceDocRef: 'PDI-012' },
      { type: 'holdback', amountCents: -455000, sourceDocRef: 'HB-012' },
    ]},
  { vin: 'KMHD841CBRU000113', stockNumber: 'N013', make: 'Hyundai', model: 'Staria', variant: 'Highlander', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 5780000, sourceDocRef: 'HMCA-INV-2213' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-013' },
      { type: 'pdi', amountCents: 55000, sourceDocRef: 'PDI-013' },
      { type: 'holdback', amountCents: -430000, sourceDocRef: 'HB-013' },
    ]},
  { vin: 'KMHD841CBRU000114', stockNumber: 'N014', make: 'Hyundai', model: 'Venue', variant: 'Active', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 2150000, sourceDocRef: 'HMCA-INV-2214' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-014' },
      { type: 'pdi', amountCents: 45000, sourceDocRef: 'PDI-014' },
      { type: 'holdback', amountCents: -160000, sourceDocRef: 'HB-014' },
    ]},
  { vin: 'KMHD841CBRU000115', stockNumber: 'N015', make: 'Hyundai', model: 'Tucson', variant: 'Elite', year: 2026, class: 'new', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 3680000, sourceDocRef: 'HMCA-INV-2215' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-015' },
      { type: 'pdi', amountCents: 55000, sourceDocRef: 'PDI-015' },
      { type: 'holdback', amountCents: -275000, sourceDocRef: 'HB-015' },
    ]},

  // ═══════ USED VEHICLES — DELIVERED (10) ═══════
  { vin: 'WBAPH7C55BA123456', stockNumber: 'U001', make: 'BMW', model: '320i', variant: 'Sport Line', year: 2023, class: 'used', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 3200000, sourceDocRef: 'TRADE-001' },
      { type: 'recon', amountCents: 185000, sourceDocRef: 'REC-001' },
      { type: 'transport', amountCents: 45000, sourceDocRef: 'TR-U001' },
    ]},
  { vin: 'JN1TBNT30Z0123456', stockNumber: 'U002', make: 'Nissan', model: 'X-Trail', variant: 'ST', year: 2024, class: 'used', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 2650000, sourceDocRef: 'TRADE-002' },
      { type: 'recon', amountCents: 125000, sourceDocRef: 'REC-002' },
    ]},
  { vin: 'JTDKN3DU5A0123456', stockNumber: 'U003', make: 'Toyota', model: 'Corolla', variant: 'Ascent Sport', year: 2023, class: 'used', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 2180000, sourceDocRef: 'TRADE-003' },
      { type: 'recon', amountCents: 95000, sourceDocRef: 'REC-003' },
    ]},
  { vin: 'MALA741CBMA123456', stockNumber: 'U004', make: 'Mazda', model: 'CX-5', variant: 'Maxx Sport', year: 2024, class: 'used', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 2980000, sourceDocRef: 'TRADE-004' },
      { type: 'recon', amountCents: 145000, sourceDocRef: 'REC-004' },
      { type: 'transport', amountCents: 55000, sourceDocRef: 'TR-U004' },
    ]},
  { vin: 'WF0XXXGCDX1234567', stockNumber: 'U005', make: 'Ford', model: 'Ranger', variant: 'XLT', year: 2023, class: 'used', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 3850000, sourceDocRef: 'TRADE-005' },
      { type: 'recon', amountCents: 210000, sourceDocRef: 'REC-005' },
    ]},
  { vin: 'KMHD841CBRU200001', stockNumber: 'U006', make: 'Hyundai', model: 'Tucson', variant: 'Active', year: 2024, class: 'used', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 2750000, sourceDocRef: 'TRADE-006' },
      { type: 'recon', amountCents: 75000, sourceDocRef: 'REC-006' },
    ]},
  { vin: 'KMHD841CBRU200002', stockNumber: 'U007', make: 'Hyundai', model: 'i30', variant: 'Active', year: 2024, class: 'used', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 1980000, sourceDocRef: 'TRADE-007' },
      { type: 'recon', amountCents: 65000, sourceDocRef: 'REC-007' },
    ]},
  { vin: 'KNAGM4A70F5123456', stockNumber: 'U008', make: 'Kia', model: 'Sportage', variant: 'GT-Line', year: 2024, class: 'used', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 3350000, sourceDocRef: 'TRADE-008' },
      { type: 'recon', amountCents: 130000, sourceDocRef: 'REC-008' },
    ]},
  { vin: 'ZHWEF4ZF7LLA12345', stockNumber: 'U009', make: 'Volkswagen', model: 'Tiguan', variant: '132TSI', year: 2023, class: 'used', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 3100000, sourceDocRef: 'TRADE-009' },
      { type: 'recon', amountCents: 155000, sourceDocRef: 'REC-009' },
    ]},
  { vin: 'SALYK2EX5LA123456', stockNumber: 'U010', make: 'Subaru', model: 'Forester', variant: '2.5i-L', year: 2024, class: 'used', status: 'delivered',
    costLines: [
      { type: 'invoice', amountCents: 2890000, sourceDocRef: 'TRADE-010' },
      { type: 'recon', amountCents: 110000, sourceDocRef: 'REC-010' },
    ]},

  // ═══════ NEW VEHICLES — IN STOCK (10) ═══════
  { vin: 'KMHD841CBRU000201', stockNumber: 'N016', make: 'Hyundai', model: 'i30', variant: 'Active', year: 2026, class: 'new', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 2450000, sourceDocRef: 'HMCA-INV-2216' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-016' },
      { type: 'pdi', amountCents: 45000, sourceDocRef: 'PDI-016' },
    ]},
  { vin: 'KMHD841CBRU000202', stockNumber: 'N017', make: 'Hyundai', model: 'Tucson', variant: 'Active', year: 2026, class: 'new', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 3250000, sourceDocRef: 'HMCA-INV-2217' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-017' },
      { type: 'pdi', amountCents: 55000, sourceDocRef: 'PDI-017' },
    ]},
  { vin: 'KMHD841CBRU000203', stockNumber: 'N018', make: 'Hyundai', model: 'Kona', variant: 'Elite', year: 2026, class: 'new', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 3150000, sourceDocRef: 'HMCA-INV-2218' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-018' },
      { type: 'pdi', amountCents: 45000, sourceDocRef: 'PDI-018' },
    ]},
  { vin: 'KMHD841CBRU000204', stockNumber: 'N019', make: 'Hyundai', model: 'Santa Fe', variant: 'Elite', year: 2026, class: 'new', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 4890000, sourceDocRef: 'HMCA-INV-2219' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-019' },
      { type: 'pdi', amountCents: 55000, sourceDocRef: 'PDI-019' },
    ]},
  { vin: 'KMHD841CBRU000205', stockNumber: 'N020', make: 'Hyundai', model: 'IONIQ 5', variant: 'Epiq', year: 2026, class: 'new', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 4980000, sourceDocRef: 'HMCA-INV-2220' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-020' },
      { type: 'pdi', amountCents: 65000, sourceDocRef: 'PDI-020' },
    ]},
  { vin: 'KMHD841CBRU000206', stockNumber: 'N021', make: 'Hyundai', model: 'Palisade', variant: 'Elite', year: 2026, class: 'new', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 5650000, sourceDocRef: 'HMCA-INV-2221' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-021' },
      { type: 'pdi', amountCents: 65000, sourceDocRef: 'PDI-021' },
    ]},
  { vin: 'KMHD841CBRU000207', stockNumber: 'N022', make: 'Hyundai', model: 'Venue', variant: 'Elite', year: 2026, class: 'new', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 2380000, sourceDocRef: 'HMCA-INV-2222' },
      { type: 'transport', amountCents: 89500, sourceDocRef: 'TR-022' },
      { type: 'pdi', amountCents: 45000, sourceDocRef: 'PDI-022' },
    ]},

  // ═══════ USED VEHICLES — IN STOCK (5) ═══════
  { vin: 'MHJRA1A65NP123456', stockNumber: 'U011', make: 'Honda', model: 'HR-V', variant: 'VTi-LX', year: 2024, class: 'used', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 2650000, sourceDocRef: 'TRADE-011' },
      { type: 'recon', amountCents: 145000, sourceDocRef: 'REC-011' },
    ]},
  { vin: 'KMHD841CBRU200003', stockNumber: 'U012', make: 'Hyundai', model: 'Kona', variant: 'Elite', year: 2024, class: 'used', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 2480000, sourceDocRef: 'TRADE-012' },
      { type: 'recon', amountCents: 85000, sourceDocRef: 'REC-012' },
    ]},
  { vin: 'WF0XXXGCDX2345678', stockNumber: 'U013', make: 'Ford', model: 'Everest', variant: 'Trend', year: 2023, class: 'used', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 4250000, sourceDocRef: 'TRADE-013' },
      { type: 'recon', amountCents: 195000, sourceDocRef: 'REC-013' },
    ]},
  { vin: 'JTDKN3DU5A1234567', stockNumber: 'U014', make: 'Toyota', model: 'RAV4', variant: 'GXL', year: 2024, class: 'used', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 3580000, sourceDocRef: 'TRADE-014' },
      { type: 'recon', amountCents: 120000, sourceDocRef: 'REC-014' },
    ]},
  { vin: 'KMHD841CBRU200004', stockNumber: 'U015', make: 'Hyundai', model: 'Santa Fe', variant: 'Active', year: 2023, class: 'used', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 3120000, sourceDocRef: 'TRADE-015' },
      { type: 'recon', amountCents: 175000, sourceDocRef: 'REC-015' },
    ]},

  // ═══════ DEMO VEHICLES (3) ═══════
  { vin: 'KMHD841CBRU000301', stockNumber: 'D001', make: 'Hyundai', model: 'Tucson', variant: 'Highlander', year: 2026, class: 'demo', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 4120000, sourceDocRef: 'HMCA-INV-DEMO1' },
      { type: 'pdi', amountCents: 55000, sourceDocRef: 'PDI-D001' },
    ]},
  { vin: 'KMHD841CBRU000302', stockNumber: 'D002', make: 'Hyundai', model: 'IONIQ 5', variant: 'Dynamiq', year: 2026, class: 'demo', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 5280000, sourceDocRef: 'HMCA-INV-DEMO2' },
      { type: 'pdi', amountCents: 65000, sourceDocRef: 'PDI-D002' },
    ]},
  { vin: 'KMHD841CBRU000303', stockNumber: 'D003', make: 'Hyundai', model: 'Santa Fe', variant: 'Calligraphy', year: 2026, class: 'demo', status: 'in_stock',
    costLines: [
      { type: 'invoice', amountCents: 5850000, sourceDocRef: 'HMCA-INV-DEMO3' },
      { type: 'pdi', amountCents: 65000, sourceDocRef: 'PDI-D003' },
    ]},
];

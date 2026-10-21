import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const deals = await db.collection('dealjackets').find({}).sort({ deliveryDate: 1 }).toArray();
  console.log(`Total deals in DB: ${deals.length}`);

  // Group by month
  const byMonth = {};
  for (const d of deals) {
    const m = d.deliveryDate ? d.deliveryDate.toISOString().slice(0, 7) : 'no-date';
    byMonth[m] = (byMonth[m] || 0) + 1;
  }
  console.log('Deals by month:', byMonth);

  // Look at September 2026 deals
  const septDeals = deals.filter(d => d.deliveryDate && d.deliveryDate.toISOString().startsWith('2026-09'));
  console.log(`September 2026 deals: ${septDeals.length}`);

  for (const d of septDeals.slice(0, 10)) {
    const v = await db.collection('vehicles').findOne({ _id: d.vehicleId });
    console.log({
      dealNumber: d.dealNumber,
      dept: d.department,
      customerRef: d.customerRef,
      sellingPriceCents: d.sellingPriceCents,
      vehicleDepositCents: d.vehicleDepositCents,
      settlementsCents: d.settlementsCents,
      stockNumber: v?.stockNumber,
      vin: v?.vin,
      model: v?.model,
      variant: v?.variant,
      category: v?.category,
      totalCostCents: v?.totalCostCents
    });
  }

  // Also look at vehicles in stock
  const inStockVehicles = await db.collection('vehicles').find({
    status: { $in: ['in_stock', 'stock', 'available'] }
  }).limit(10).toArray();
  console.log('In stock vehicles count sample:');
  for (const v of inStockVehicles) {
    console.log({
      stockNumber: v.stockNumber,
      vin: v.vin,
      category: v.category,
      make: v.make,
      model: v.model,
      variant: v.variant,
      status: v.status,
      totalCostCents: v.totalCostCents
    });
  }

  // Also check existing suppliers
  const suppliers = await db.collection('suppliers').find({}).limit(10).toArray();
  console.log('Suppliers:', suppliers.map(s => ({ code: s.code, name: s.name, category: s.category })));

  await mongoose.disconnect();
}

main().catch(console.error);

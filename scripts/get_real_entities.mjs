import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const newStock = await db.collection('vehicles').find({ class: 'new', status: 'in_stock' }).limit(10).toArray();
  console.log('--- IN-STOCK NEW VEHICLES ---');
  for (const v of newStock) {
    console.log({ stockNumber: v.stockNumber, vin: v.vin, model: v.model, variant: v.variant, totalCostCents: v.totalCostCents });
  }

  const usedStock = await db.collection('vehicles').find({ class: 'used', status: 'in_stock' }).limit(6).toArray();
  console.log('\n--- IN-STOCK USED VEHICLES ---');
  for (const v of usedStock) {
    console.log({ stockNumber: v.stockNumber, vin: v.vin, model: v.model, variant: v.variant, totalCostCents: v.totalCostCents });
  }

  const deliveredNew = await db.collection('vehicles').find({ class: 'new', status: 'delivered' }).limit(10).toArray();
  console.log('\n--- DELIVERED NEW VEHICLES ---');
  for (const v of deliveredNew) {
    console.log({ stockNumber: v.stockNumber, vin: v.vin, model: v.model, variant: v.variant, totalCostCents: v.totalCostCents });
  }

  const septDeals = await db.collection('dealjackets').find({
    deliveryDate: { $gte: new Date('2026-09-01'), $lte: new Date('2026-09-30T23:59:59Z') }
  }).sort({ deliveryDate: 1 }).limit(12).toArray();
  console.log('\n--- SEPTEMBER REAL DEALS ---');
  for (const d of septDeals) {
    const v = await db.collection('vehicles').findOne({ _id: d.vehicleId });
    console.log({
      dealNumber: d.dealNumber,
      dept: d.department,
      date: d.deliveryDate.toISOString().slice(0, 10),
      customerRef: d.customerRef,
      sellingPriceCents: d.sellingPriceCents,
      gstCents: d.gstCents,
      totalGross: (d.sellingPriceCents || 0) + (d.gstCents || 0),
      stockNumber: v?.stockNumber,
      vin: v?.vin,
      model: v?.model,
      variant: v?.variant
    });
  }

  await mongoose.disconnect();
}

main().catch(console.error);

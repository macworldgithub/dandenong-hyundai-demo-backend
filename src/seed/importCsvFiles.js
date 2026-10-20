import { connectDB, disconnectDB } from '../config/db.js';
import { importAllDefaultCsvs } from '../services/csvImportService.js';
import DealJacket from '../models/DealJacket.js';
import Vehicle from '../models/Vehicle.js';

async function run() {
  console.log('Connecting to database...');
  await connectDB();

  console.log('Starting CSV import process...');
  const result = await importAllDefaultCsvs();
  console.log('Import results:', JSON.stringify(result, null, 2));

  const totalDeals = await DealJacket.countDocuments();
  const totalVehicles = await Vehicle.countDocuments();
  const deliveredVehicles = await Vehicle.countDocuments({ status: 'delivered' });

  console.log(`\nVerification:`);
  console.log(`- Total Deal Jackets in DB: ${totalDeals}`);
  console.log(`- Total Vehicles in DB: ${totalVehicles}`);
  console.log(`- Total Delivered Vehicles: ${deliveredVehicles}`);

  const sampleDeal = await DealJacket.findOne({ dealNumber: 'DH17868' }).populate('vehicleId');
  console.log('\nSample Deal DH17868:');
  console.log(JSON.stringify(sampleDeal, null, 2));

  const sampleUsedDeal = await DealJacket.findOne({ dealNumber: 'DU24371' }).populate('vehicleId');
  console.log('\nSample Used Deal DU24371:');
  console.log(JSON.stringify(sampleUsedDeal, null, 2));

  await disconnectDB();
  console.log('Done.');
}

run().catch(async (err) => {
  console.error('Import error:', err);
  await disconnectDB();
  process.exit(1);
});

import { connectDB, disconnectDB } from '../config/db.js';
import mongoose from 'mongoose';
import Vehicle from '../models/Vehicle.js';
import DealJacket from '../models/DealJacket.js';
import FloorplanDraw from '../models/FloorplanDraw.js';
import { vehiclesFixture } from './fixtures/vehicles.js';
import { sumCents } from '../utils/money.js';

async function replaceVehicles() {
  await connectDB();

  const vehicles = vehiclesFixture.map((vehicle) => ({
    ...vehicle,
    totalCostCents: sumCents(vehicle.costLines.map((line) => line.amountCents)),
  }));

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // The supplied CSV snapshot has no deal-jacket or floorplan records. Remove
      // records linked to the superseded stock before replacing the vehicle register.
      await DealJacket.deleteMany({}, { session });
      await FloorplanDraw.deleteMany({}, { session });
      await Vehicle.deleteMany({}, { session });
      await Vehicle.insertMany(vehicles, { session });
    });
  } finally {
    await session.endSession();
  }

  const counts = vehicles.reduce((result, vehicle) => {
    result[vehicle.class] = (result[vehicle.class] || 0) + 1;
    return result;
  }, {});
  console.log(`Replaced vehicle register with ${vehicles.length} CSV records`, counts);
}

replaceVehicles()
  .then(disconnectDB)
  .catch(async (error) => {
    console.error('Vehicle replacement failed:', error);
    await disconnectDB();
    process.exit(1);
  });

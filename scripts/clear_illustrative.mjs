import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const c of collections) {
    const res = await mongoose.connection.db.collection(c.name).updateMany({ isIllustrative: true }, { $set: { isIllustrative: false } });
    if (res.modifiedCount > 0) {
      console.log(`Updated ${c.name}: cleared ${res.modifiedCount} illustrative flags`);
    }
  }
  await mongoose.disconnect();
}

main().catch(console.error);

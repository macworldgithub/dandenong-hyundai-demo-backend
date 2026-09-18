import mongoose from 'mongoose';
import env from './env.js';

export async function connectDB() {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      // Mongoose 8 defaults are fine; explicit for clarity
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅  MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

export default mongoose;

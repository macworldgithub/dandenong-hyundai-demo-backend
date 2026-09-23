import mongoose from 'mongoose';
import env from './env.js';

let connectionPromise;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      })
      .then(() => {
        console.log('MongoDB connected:', mongoose.connection.host);
        return mongoose.connection;
      })
      .catch((err) => {
        connectionPromise = undefined;
        console.error('MongoDB connection failed:', err.message);
        throw err;
      });
  }

  return connectionPromise;
}

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

export async function disconnectDB() {
  connectionPromise = undefined;
  await mongoose.disconnect();
}

export default mongoose;

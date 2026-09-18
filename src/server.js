import env from './config/env.js';
import { connectDB } from './config/db.js';
import app from './app.js';

async function start() {
  console.log('🚀  Starting Dandenong Hyundai Demo Backend...\n');

  // Connect to MongoDB
  await connectDB();

  // Start HTTP server
  app.listen(env.PORT, () => {
    console.log(`\n✅  Server running on http://localhost:${env.PORT}`);
    console.log(`   Health check: http://localhost:${env.PORT}/health`);
    console.log(`   API base:     http://localhost:${env.PORT}/api`);
    console.log(`   Environment:  ${env.NODE_ENV}\n`);
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

import 'dotenv/config';

const required = ['MONGODB_URI', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`\n❌  Missing required environment variable: ${key}`);
    console.error(`    Copy .env.example to .env and fill in the values.\n`);
    process.exit(1);
  }
}

const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  DUAL_APPROVAL_THRESHOLD_CENTS: parseInt(
    process.env.DUAL_APPROVAL_THRESHOLD_CENTS || '500000',
    10
  ),
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export default env;

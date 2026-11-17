import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

// Require JWT_SECRET from environment variables to prevent token forgery
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('\n❌ [FATAL SECURITY ERROR]: JWT_SECRET is required. Please configure JWT_SECRET in your environment variables or .env file before starting the server.\n');
  process.exit(1);
}

// Mutable runtime config (commission fees can be updated by admin at runtime)
export const CONFIG: {
  PORT: number | string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: string;
  CORS_ORIGIN: string;
  STATIC_CLIENT_PATH?: string;
  UPLOAD_DIR: string;
  DEFAULT_LENDER_COMMISSION: number;
  DEFAULT_RECEIVER_COMMISSION: number;
  DEFAULT_INSPECTION_MINUTES: number;
  MAX_INSPECTION_MINUTES: number;
} = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: jwtSecret,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  STATIC_CLIENT_PATH: process.env.STATIC_CLIENT_PATH || '',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
  DEFAULT_LENDER_COMMISSION: Number(process.env.DEFAULT_LENDER_COMMISSION) || 15,
  DEFAULT_RECEIVER_COMMISSION: Number(process.env.DEFAULT_RECEIVER_COMMISSION) || 15,
  DEFAULT_INSPECTION_MINUTES: Number(process.env.DEFAULT_INSPECTION_MINUTES) || 15,
  MAX_INSPECTION_MINUTES: 20
};


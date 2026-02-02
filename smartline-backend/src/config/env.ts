import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variable schema with validation
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),

  // Database
  SUPABASE_URL: z.string().url().min(1, 'SUPABASE_URL is required'),
  SUPABASE_KEY: z.string().min(1, 'SUPABASE_KEY is required'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),
  DATABASE_URL: z.string().url().optional(),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Payment Gateway (Kashier)
  KASHIER_MERCHANT_ID: z.string().min(1, 'KASHIER_MERCHANT_ID is required'),
  KASHIER_API_KEY: z.string().min(1, 'KASHIER_API_KEY is required'),
  KASHIER_WEBHOOK_SECRET: z.string().min(1, 'KASHIER_WEBHOOK_SECRET is required'),
  KASHIER_MODE: z.enum(['test', 'live']).default('test'),
  KASHIER_CURRENCY: z.string().default('EGP'),

  // Redis
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // External APIs
  MAPBOX_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),

  // Monitoring (optional)
  SENTRY_DSN: z.string().url().optional(),
});

// Validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// Export validated configuration
export const config = validateEnv();

// Helper to check if running in production
export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';
export const isTest = config.NODE_ENV === 'test';

// Prevent sensitive data exposure
export function getSafeConfig() {
  return {
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
    corsOrigin: config.CORS_ORIGIN,
    kashierMode: config.KASHIER_MODE,
    // Never expose secrets
  };
}

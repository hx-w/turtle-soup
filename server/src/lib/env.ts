import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().optional(),
  INITIAL_INVITE_CODE: z.string().default('TURTLE2024'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

function loadEnv() {
  if (process.env.NODE_ENV === 'production') {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
      process.exit(1);
    }
    return result.data;
  }

  // In development/test, allow fallback values
  return envSchema.parse({
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/turtle_soup',
    JWT_SECRET: process.env.JWT_SECRET || 'dev_secret',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
  });
}

export const env = loadEnv();

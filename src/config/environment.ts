import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().transform(val => parseInt(val, 10)).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  WEATHER_API_KEY: z.string().default('your_default_api_key'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Parse environment with fallbacks
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('Environment validation error:', error);
    return envSchema.parse({}); // Use defaults
  }
};

const env = parseEnv();

const environment = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  weatherApiKey: env.WEATHER_API_KEY,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  logLevel: env.LOG_LEVEL,
};

export default environment;

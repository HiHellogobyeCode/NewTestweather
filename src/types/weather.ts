import { z } from 'zod';

export const weatherResponseSchema = z.object({
  location: z.string(),
  temperature: z.number(),
  unit: z.enum(['celsius', 'fahrenheit']),
  condition: z.string(),
  humidity: z.number().min(0).max(100),
  windSpeed: z.number().min(0),
  timestamp: z.string(),
  feelsLike: z.number().optional(),
  pressure: z.number().optional(),
  visibility: z.number().optional(),
  updated: z.boolean().default(true)
});

export type WeatherData = z.infer<typeof weatherResponseSchema>;

export class WeatherError extends Error {
  constructor(message: string, public readonly statusCode: number = 500) {
    super(message);
    this.name = 'WeatherError';
    Object.setPrototypeOf(this, WeatherError.prototype);
  }
}

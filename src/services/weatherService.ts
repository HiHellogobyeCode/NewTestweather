import { WeatherData, WeatherError } from '../types/weather';
import config from '../config/environment';
import logger from '../utils/logger';

// Simple in-memory cache
interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

class WeatherService {
  private apiKey: string;
  private cache: Map<string, CacheEntry>;
  private readonly CACHE_TTL = 1000 * 60 * 10; // 10 minutes

  constructor() {
    this.apiKey = config.weatherApiKey;
    this.cache = new Map();
  }

  /**
   * Fetches weather data for the specified location
   * @param location The location to get weather data for
   * @returns Promise with the weather data
   */
  async getWeatherByLocation(location: string): Promise<WeatherData> {
    try {
      const normalizedLocation = location.toLowerCase().trim();
      
      // Check cache first
      const cachedData = this.checkCache(normalizedLocation);
      if (cachedData) {
        logger.debug(`Cache hit for location: ${normalizedLocation}`);
        return cachedData;
      }

      // In a real app, we would call an external API here using this.apiKey
      logger.info(`Fetching weather for ${normalizedLocation} using API key: ${this.apiKey.substring(0, 3)}...`);
      const weatherData = await this.fetchFromApi(normalizedLocation);
      
      // Store in cache
      this.cache.set(normalizedLocation, {
        data: weatherData,
        timestamp: Date.now()
      });
      
      return weatherData;
    } catch (error) {
      logger.error('Error in weatherService:', error);
      if (error instanceof WeatherError) {
        throw error;
      }
      throw new WeatherError('Failed to fetch weather data', 500);
    }
  }

  private checkCache(location: string): WeatherData | null {
    const cached = this.cache.get(location);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(location);
    }
    
    return null;
  }

  private async fetchFromApi(location: string): Promise<WeatherData> {
    // TODO: In a real app, we would use this.apiKey to authenticate the API request
    // For now using mock data
    return {
      location,
      temperature: Math.floor(Math.random() * 30),
      unit: 'celsius',
      condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Stormy'][Math.floor(Math.random() * 5)],
      humidity: Math.floor(Math.random() * 100),
      windSpeed: Math.floor(Math.random() * 20),
      timestamp: new Date().toISOString(),
      pressure: 1013 + Math.floor(Math.random() * 20) - 10,
      feelsLike: Math.floor(Math.random() * 30) - 2,
      updated: true // Added the missing 'updated' property required by the schema
    };
  }
}

export default new WeatherService();

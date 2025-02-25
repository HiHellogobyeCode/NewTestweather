import weatherService from '../services/weatherService';
import { WeatherData } from '../types/weather';
import logger from '../utils/logger';

class WeatherController {
  /**
   * Get weather data for a specific location
   * @param location - The location to get weather for
   */
  async getWeatherForLocation(location: string): Promise<WeatherData> {
    try {
      logger.info(`Fetching weather data for location: ${location}`);
      const weatherData = await weatherService.getWeatherByLocation(location);
      return weatherData;
    } catch (error) {
      logger.error(`Error fetching weather for ${location}:`, error);
      throw error;
    }
  }
}

export default new WeatherController();

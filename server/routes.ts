import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // Weather API proxy
  app.get('/api/weather', async (req, res) => {
    try {
      const { lat, lon } = req.query;
      
      // Fetch weather data from Open-Meteo
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
      
      const weatherRes = await fetch(weatherUrl);
      const weatherData = await weatherRes.json();
      
      // Get location name from OpenStreetMap
      const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
      const geoRes = await fetch(geoUrl, {
        headers: { 'User-Agent': 'DotMatrixWeather/1.0' }
      });
      const geoData = await geoRes.json();
      
      // Map weather codes to conditions
      const getCondition = (code: number) => {
        if (code === 0) return 'Clear';
        if ([1,2,3].includes(code)) return 'Clouds';
        if ([51,53,55,61,63,65,80,81,82].includes(code)) return 'Rain';
        if ([71,73,75,77,85,86].includes(code)) return 'Snow';
        return 'Clear';
      };
      
      // Format response
      const response = {
        location: geoData.address.city || 
                 geoData.address.town || 
                 geoData.address.village || 
                 geoData.address.county ||
                 'Unknown',
        current: {
          temp: weatherData.current.temperature_2m,
          humidity: weatherData.current.relative_humidity_2m,
          windSpeed: Math.round(weatherData.current.wind_speed_10m),
          condition: getCondition(weatherData.current.weather_code)
        },
        hourly: weatherData.hourly.time.map((time: string, i: number) => ({
          time,
          temp: weatherData.hourly.temperature_2m[i],
          condition: getCondition(weatherData.hourly.weather_code[i])
        }))
      };
      
      res.json(response);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch weather data' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import { Router, Request, Response, NextFunction } from 'express';
import weatherController from '../controllers/weatherController';
import { validateLocation } from '../middleware/validation';

const router = Router();

/**
 * @route GET /api/weather
 * @desc Get weather data for a location
 */
router.get('/', validateLocation, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location } = req.query as { location: string };
    const weatherData = await weatherController.getWeatherForLocation(location);
    res.status(200).json(weatherData);
  } catch (error) {
    next(error);
  }
});

export default router;

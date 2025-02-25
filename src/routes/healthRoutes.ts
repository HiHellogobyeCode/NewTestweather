import { Router, Request, Response } from 'express';

const router = Router();

/**
 * @route GET /api/health
 * @desc Health check endpoint
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Weather API is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

export default router;

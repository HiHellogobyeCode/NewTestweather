import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import logger from '../utils/logger';

export const validateLocation = (req: Request, res: Response, next: NextFunction): void => {
  const schema = z.object({
    location: z.string().min(2).max(100)
  });

  try {
    const result = schema.parse({ location: req.query.location });
    req.query.location = result.location;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      res.status(400).json({ 
        error: 'Validation error', 
        details: validationError.message 
      });
    } else {
      res.status(400).json({ 
        error: 'Invalid location parameter' 
      });
    }
  }
};

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  logger.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

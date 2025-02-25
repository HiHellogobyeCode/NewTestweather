import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes';
import { errorHandler } from './middleware/validation';
import environment from './config/environment';
import logger from './utils/logger';

// Initialize express app
const app = express();
const port = environment.port;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for simplicity in development
}));
app.use(cors());

// Parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - serve before any route handling
app.use(express.static(path.join(__dirname, '../public')));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// API routes - Keep these after static files but before the catch-all route
app.use('/api', apiRoutes);

// Root route - ensure HTML is served
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  // For API requests, return JSON
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // For web requests, serve the index.html
  return res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
if (require.main === module) {
  app.listen(port, () => {
    logger.info(`Weather application server is running on port ${port} in ${environment.nodeEnv} mode`);
    logger.info(`Visit http://localhost:${port} to see the application`);
  });
}

export default app;

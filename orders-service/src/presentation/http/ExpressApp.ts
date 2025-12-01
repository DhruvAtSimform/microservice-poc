import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { createOrderRoutes } from '@presentation/routes/OrderRoutes.js';

/**
 * Express Application Configuration
 * Sets up middleware, routes, and error handlers
 */
export function createExpressApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'orders-service' });
  });

  // API Routes
  app.use('/api/orders', createOrderRoutes());

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not found',
    });
  });

  return app;
}

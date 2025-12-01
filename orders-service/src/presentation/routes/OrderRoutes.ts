import { Router } from 'express';
import { ExpressAdapter } from '@presentation/http/ExpressAdapter.js';
import {
  createOrderController,
  getOrderByIdController,
  getOrdersByCustomerController,
} from '@application/instances.js';

/**
 * Order Routes
 * Defines HTTP routes for order operations
 */
export function createOrderRoutes(): Router {
  const router = Router();

  // POST /api/orders - Create new order
  router.post('/', ExpressAdapter.adapt(createOrderController));

  // GET /api/orders/:id - Get order by ID
  router.get('/:id', ExpressAdapter.adapt(getOrderByIdController));

  // GET /api/orders?customerId=xxx - Get orders by customer
  router.get('/', ExpressAdapter.adapt(getOrdersByCustomerController));

  return router;
}

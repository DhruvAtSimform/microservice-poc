import { Router } from 'express';
import { ExpressAdapter } from '@presentation/http/ExpressAdapter.js';
import { CreateProductController } from '@presentation/controllers/ProductController.js';
import { GetAllProductsController } from '@presentation/controllers/GetAllProductsController.js';
import { GetProductByIdController } from '@presentation/controllers/GetProductByIdController.js';
import {
  createProductUseCase,
  getAllProductsUseCase,
  getProductByIdUseCase,
} from '@application/instances.js';

/**
 * Product Routes
 * Configures all product-related API endpoints
 */
export function createProductRoutes(): Router {
  const router = Router();

  // Manually create controller instances by passing use case dependencies
  const createProductController = new CreateProductController(createProductUseCase);
  const getAllProductsController = new GetAllProductsController(getAllProductsUseCase);
  const getProductByIdController = new GetProductByIdController(getProductByIdUseCase);

  // POST /products - Create a new product
  router.post('/', ExpressAdapter.adapt(createProductController));

  // GET /products - Get all products
  router.get('/', ExpressAdapter.adapt(getAllProductsController));

  // GET /products/:id - Get product by ID
  router.get('/:id', ExpressAdapter.adapt(getProductByIdController));

  return router;
}

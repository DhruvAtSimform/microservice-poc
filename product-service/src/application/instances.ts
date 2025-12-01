/**
 * Use Case Singleton Instances
 * Central file to export all use case singleton instances
 */

import { CreateProductUseCase } from '@application/use-cases/CreateProductUseCase.js';
import { GetAllProductsUseCase } from '@application/use-cases/GetAllProductsUseCase.js';
import { GetProductByIdUseCase } from '@application/use-cases/GetProductByIdUseCase.js';
import { ProductReservationSaga } from '@application/sagas/ProductReservationSaga.js';

/**
 * Use case instances
 */
export const createProductUseCase = new CreateProductUseCase();
export const getAllProductsUseCase = new GetAllProductsUseCase();
export const getProductByIdUseCase = new GetProductByIdUseCase();

/**
 * Saga instances
 */
export const productReservationSaga = new ProductReservationSaga();

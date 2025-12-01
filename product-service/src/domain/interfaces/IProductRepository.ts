import { Product } from '@domain/entities/Product.js';
import { ProductId } from '@domain/value-objects/ProductId.js';

/**
 * Product Repository Interface (Port)
 * Defines the contract for product persistence
 * Implementation will be in the infrastructure layer
 */
export interface IProductRepository {
  findById(id: ProductId): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  save(product: Product): Promise<void>;
  update(product: Product): Promise<void>;
  delete(id: ProductId): Promise<void>;
  existsById(id: ProductId): Promise<boolean>;
}

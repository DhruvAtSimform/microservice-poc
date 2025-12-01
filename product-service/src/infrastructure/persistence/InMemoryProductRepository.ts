import { Product } from '@domain/entities/Product.js';
import { ProductId } from '@domain/value-objects/ProductId.js';
import { IProductRepository } from '@domain/interfaces/IProductRepository.js';

/**
 * In-Memory Product Repository Implementation
 * Adapter implementing the repository port
 * For production, replace with actual database implementation
 */
export class InMemoryProductRepository implements IProductRepository {
  private products: Map<string, Product> = new Map();

  async findById(id: ProductId): Promise<Product | null> {
    return Promise.resolve(this.products.get(id.toString()) || null);
  }

  async findAll(): Promise<Product[]> {
    return Promise.resolve(Array.from(this.products.values()));
  }

  async save(product: Product): Promise<void> {
    this.products.set(product.id.toString(), product);
    return Promise.resolve();
  }

  async update(product: Product): Promise<void> {
    if (!this.products.has(product.id.toString())) {
      throw new Error('Product not found');
    }
    this.products.set(product.id.toString(), product);
    return Promise.resolve();
  }

  async delete(id: ProductId): Promise<void> {
    this.products.delete(id.toString());
    return Promise.resolve();
  }

  async existsById(id: ProductId): Promise<boolean> {
    return Promise.resolve(this.products.has(id.toString()));
  }
}

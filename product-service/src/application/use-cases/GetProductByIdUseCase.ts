import { ProductId } from '@domain/value-objects/ProductId.js';
import { ProductResponseDTO } from '@application/dto/ProductResponseDTO.js';
import { productRepository } from '@infrastructure/instances.js';

/**
 * Get Product By ID Use Case
 * Retrieves a specific product by its ID
 */
export class GetProductByIdUseCase {
  async execute(id: string): Promise<ProductResponseDTO | null> {
    const productId = new ProductId(id);
    const product = await productRepository.findById(productId);

    if (!product) {
      return null;
    }

    return {
      id: product.id.toString(),
      name: product.name,
      description: product.description,
      price: product.price.getAmount(),
      currency: product.price.getCurrency(),
      stock: product.stock,
      isActive: product.isActive,
    };
  }
}

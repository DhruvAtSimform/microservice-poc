import { ProductResponseDTO } from '@application/dto/ProductResponseDTO.js';
import { productRepository } from '@infrastructure/instances.js';

/**
 * Get All Products Use Case
 * Retrieves all products from the repository
 */
export class GetAllProductsUseCase {
  async execute(): Promise<ProductResponseDTO[]> {
    const products = await productRepository.findAll();

    return products.map((product) => ({
      id: product.id.toString(),
      name: product.name,
      description: product.description,
      price: product.price.getAmount(),
      currency: product.price.getCurrency(),
      stock: product.stock,
      isActive: product.isActive,
    }));
  }
}

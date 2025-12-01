import { Product } from '@domain/entities/Product.js';
import { ProductId } from '@domain/value-objects/ProductId.js';
import { Money } from '@domain/value-objects/Money.js';
import { ProductCreatedEvent } from '@domain/events/ProductCreatedEvent.js';
import { CreateProductDTO } from '@application/dto/CreateProductDTO.js';
import { ProductResponseDTO } from '@application/dto/ProductResponseDTO.js';
import { productRepository, eventPublisher } from '@infrastructure/instances.js';

/**
 * Create Product Use Case
 * Orchestrates the creation of a new product
 */
export class CreateProductUseCase {
  async execute(dto: CreateProductDTO): Promise<ProductResponseDTO> {
    // Create domain objects
    const productId = ProductId.generate();
    const price = new Money(dto.price, dto.currency);

    const product = new Product(productId, dto.name, dto.description, price, dto.stock);

    // Persist
    await productRepository.save(product);

    // Publish domain event
    const event = new ProductCreatedEvent(
      productId.toString(),
      product.name,
      product.price.getAmount(),
      product.stock
    );
    await eventPublisher.publish(event);

    // Return DTO
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

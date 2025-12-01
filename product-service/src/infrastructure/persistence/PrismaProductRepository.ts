import { Product } from '@domain/entities/Product.js';
import { ProductId } from '@domain/value-objects/ProductId.js';
import { Money } from '@domain/value-objects/Money.js';
import { IProductRepository } from '@domain/interfaces/IProductRepository.js';
import { prisma } from '@infrastructure/prisma/prisma.service.js';
import type { Product as PrismaProduct } from '@prisma/client';

/**
 * Prisma Product Repository Implementation
 * Adapter implementing the repository port with Prisma ORM
 */
export class PrismaProductRepository implements IProductRepository {
  async findById(id: ProductId): Promise<Product | null> {
    const product = await prisma.product.findUnique({
      where: { id: id.toString() },
    });

    if (!product) return null;

    return this.toDomain(product);
  }

  async findAll(): Promise<Product[]> {
    const products = await prisma.product.findMany();
    return products.map((p) => this.toDomain(p));
  }

  async save(product: Product): Promise<void> {
    await prisma.product.create({
      data: {
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        price: product.price.getAmount(),
        currency: product.price.getCurrency(),
        stock: product.stock,
        isActive: product.isActive,
      },
    });
  }

  async update(product: Product): Promise<void> {
    await prisma.product.update({
      where: { id: product.id.toString() },
      data: {
        name: product.name,
        description: product.description,
        price: product.price.getAmount(),
        currency: product.price.getCurrency(),
        stock: product.stock,
        isActive: product.isActive,
      },
    });
  }

  async delete(id: ProductId): Promise<void> {
    await prisma.product.delete({
      where: { id: id.toString() },
    });
  }

  async existsById(id: ProductId): Promise<boolean> {
    const count = await prisma.product.count({
      where: { id: id.toString() },
    });
    return count > 0;
  }

  /**
   * Map Prisma model to Domain entity
   */
  private toDomain(prismaProduct: PrismaProduct): Product {
    return new Product(
      new ProductId(prismaProduct.id),
      prismaProduct.name,
      prismaProduct.description,
      new Money(prismaProduct.price, prismaProduct.currency),
      prismaProduct.stock,
      prismaProduct.isActive
    );
  }
}

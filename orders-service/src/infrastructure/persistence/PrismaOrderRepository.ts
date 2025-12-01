import { Order } from '@domain/entities/Order.js';
import { OrderId } from '@domain/value-objects/OrderId.js';
import { OrderItem } from '@domain/value-objects/OrderItem.js';
import { OrderStatus, OrderStatusEnum } from '@domain/value-objects/OrderStatus.js';
import { Money } from '@domain/value-objects/Money.js';
import { IOrderRepository } from '@domain/interfaces/IOrderRepository.js';
import { prisma } from '@infrastructure/prisma/prisma.service.js';
import type { Order as PrismaOrder, OrderItem as PrismaOrderItem } from '@prisma/client';

type PrismaOrderWithItems = PrismaOrder & {
  items: PrismaOrderItem[];
};

/**
 * Prisma Order Repository Implementation
 * Adapter implementing the repository port with Prisma ORM
 */
export class PrismaOrderRepository implements IOrderRepository {
  async findById(id: OrderId): Promise<Order | null> {
    const order = await prisma.order.findUnique({
      where: { id: id.toString() },
      include: { items: true },
    });

    if (!order) return null;

    return this.toDomain(order);
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.toDomain(order));
  }

  async findAll(): Promise<Order[]> {
    const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.toDomain(order));
  }

  async save(order: Order): Promise<void> {
    await prisma.order.create({
      data: {
        id: order.id.toString(),
        customerId: order.customerId,
        status: order.status.toString(),
        total: order.total.getAmount(),
        currency: order.total.getCurrency(),
        items: {
          create: order.items.map((item) => ({
            productId: item.getProductId(),
            productName: item.getProductName(),
            quantity: item.getQuantity(),
            unitPrice: item.getUnitPrice().getAmount(),
            subtotal: item.getSubtotal().getAmount(),
          })),
        },
      },
    });
  }

  async update(order: Order): Promise<void> {
    await prisma.order.update({
      where: { id: order.id.toString() },
      data: {
        status: order.status.toString(),
        updatedAt: order.updatedAt,
      },
    });
  }

  async delete(id: OrderId): Promise<void> {
    await prisma.order.delete({
      where: { id: id.toString() },
    });
  }

  async existsById(id: OrderId): Promise<boolean> {
    const count = await prisma.order.count({
      where: { id: id.toString() },
    });
    return count > 0;
  }

  /**
   * Map Prisma model to Domain entity
   */
  private toDomain(prismaOrder: PrismaOrderWithItems): Order {
    const items = prismaOrder.items.map((item) =>
      OrderItem.create(
        item.productId,
        item.productName,
        item.quantity,
        new Money(item.unitPrice, prismaOrder.currency)
      )
    );

    const orderId = new OrderId(prismaOrder.id);
    const status = new OrderStatus(prismaOrder.status as OrderStatusEnum);
    const total = new Money(prismaOrder.total, prismaOrder.currency);

    return new Order(
      orderId,
      prismaOrder.customerId,
      items,
      status,
      total,
      prismaOrder.createdAt,
      prismaOrder.updatedAt
    );
  }
}

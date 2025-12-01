import { Order } from '@domain/entities/Order.js';
import { OrderId } from '@domain/value-objects/OrderId.js';
import { IOrderRepository } from '@domain/interfaces/IOrderRepository.js';

/**
 * In-Memory Order Repository Implementation
 * Useful for testing and development
 */
export class InMemoryOrderRepository implements IOrderRepository {
  private orders: Map<string, Order> = new Map();

  // eslint-disable-next-line @typescript-eslint/require-await
  async findById(id: OrderId): Promise<Order | null> {
    return this.orders.get(id.toString()) || null;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findByCustomerId(customerId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((order) => order.customerId === customerId);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findAll(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async save(order: Order): Promise<void> {
    this.orders.set(order.id.toString(), order);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async update(order: Order): Promise<void> {
    this.orders.set(order.id.toString(), order);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(id: OrderId): Promise<void> {
    this.orders.delete(id.toString());
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async existsById(id: OrderId): Promise<boolean> {
    return this.orders.has(id.toString());
  }

  // Helper methods for testing
  clear(): void {
    this.orders.clear();
  }

  size(): number {
    return this.orders.size;
  }
}

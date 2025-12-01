import { Order } from '@domain/entities/Order.js';
import { OrderId } from '@domain/value-objects/OrderId.js';

/**
 * Order Repository Interface (Port)
 * Defines the contract for order persistence
 * Implementation will be in the infrastructure layer
 */
export interface IOrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  findByCustomerId(customerId: string): Promise<Order[]>;
  findAll(): Promise<Order[]>;
  save(order: Order): Promise<void>;
  update(order: Order): Promise<void>;
  delete(id: OrderId): Promise<void>;
  existsById(id: OrderId): Promise<boolean>;
}

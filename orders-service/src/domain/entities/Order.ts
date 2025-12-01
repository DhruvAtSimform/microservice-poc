import { OrderId } from '@domain/value-objects/OrderId.js';
import { OrderStatus } from '@domain/value-objects/OrderStatus.js';
import { OrderItem } from '@domain/value-objects/OrderItem.js';
import { Money } from '@domain/value-objects/Money.js';

/**
 * Order Entity - Core Domain Model
 * Represents the order aggregate root
 */
export class Order {
  constructor(
    private readonly _id: OrderId,
    private readonly _customerId: string,
    private readonly _items: OrderItem[],
    private _status: OrderStatus,
    private readonly _total: Money,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date()
  ) {
    if (_items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    // Validate that total matches sum of item subtotals
    const calculatedTotal = this.calculateTotal(_items);
    if (!_total.equals(calculatedTotal)) {
      throw new Error('Order total does not match sum of item subtotals');
    }
  }

  get id(): OrderId {
    return this._id;
  }

  get customerId(): string {
    return this._customerId;
  }

  get items(): OrderItem[] {
    return [...this._items]; // Return a copy to maintain immutability
  }

  get status(): OrderStatus {
    return this._status;
  }

  get total(): Money {
    return this._total;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business logic methods
  private calculateTotal(items: OrderItem[]): Money {
    if (items.length === 0) {
      throw new Error('Cannot calculate total for empty order');
    }

    // Start with zero and add all item subtotals
    return items.reduce(
      (total, item) => total.add(item.getSubtotal()),
      new Money(0, items[0].getUnitPrice().getCurrency())
    );
  }

  changeStatus(newStatus: OrderStatus): void {
    if (!this._status.canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid status transition from ${this._status.toString()} to ${newStatus.toString()}`
      );
    }
    this._status = newStatus;
    this._updatedAt = new Date();
  }

  confirm(): void {
    this.changeStatus(OrderStatus.confirmed());
  }

  cancel(): void {
    this.changeStatus(OrderStatus.cancelled());
  }

  fail(): void {
    this.changeStatus(OrderStatus.failed());
  }

  isPending(): boolean {
    return this._status.isPending();
  }

  isConfirmed(): boolean {
    return this._status.isConfirmed();
  }

  isCancelled(): boolean {
    return this._status.isCancelled();
  }

  isFailed(): boolean {
    return this._status.isFailed();
  }

  getItemCount(): number {
    return this._items.reduce((count, item) => count + item.getQuantity(), 0);
  }

  hasItem(productId: string): boolean {
    return this._items.some((item) => item.getProductId() === productId);
  }

  static create(customerId: string, items: OrderItem[]): Order {
    const orderId = OrderId.generate();
    const status = OrderStatus.pending();

    if (items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    // Calculate total from items
    const total = items.reduce(
      (sum, item) => sum.add(item.getSubtotal()),
      new Money(0, items[0].getUnitPrice().getCurrency())
    );

    return new Order(orderId, customerId, items, status, total);
  }
}

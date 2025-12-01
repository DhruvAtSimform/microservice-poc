import { Money } from '@domain/value-objects/Money.js';

/**
 * OrderItem Value Object
 * Represents an individual item in an order
 */
export class OrderItem {
  constructor(
    private readonly productId: string,
    private readonly productName: string,
    private readonly quantity: number,
    private readonly unitPrice: Money,
    private readonly subtotal: Money
  ) {
    if (quantity <= 0) {
      throw new Error('Order item quantity must be greater than zero');
    }

    // Validate that subtotal matches quantity * unitPrice
    const calculatedSubtotal = unitPrice.multiply(quantity);
    if (!subtotal.equals(calculatedSubtotal)) {
      throw new Error('Order item subtotal does not match quantity * unitPrice');
    }
  }

  getProductId(): string {
    return this.productId;
  }

  getProductName(): string {
    return this.productName;
  }

  getQuantity(): number {
    return this.quantity;
  }

  getUnitPrice(): Money {
    return this.unitPrice;
  }

  getSubtotal(): Money {
    return this.subtotal;
  }

  equals(other: OrderItem): boolean {
    return (
      this.productId === other.productId &&
      this.productName === other.productName &&
      this.quantity === other.quantity &&
      this.unitPrice.equals(other.unitPrice) &&
      this.subtotal.equals(other.subtotal)
    );
  }

  static create(
    productId: string,
    productName: string,
    quantity: number,
    unitPrice: Money
  ): OrderItem {
    const subtotal = unitPrice.multiply(quantity);
    return new OrderItem(productId, productName, quantity, unitPrice, subtotal);
  }
}

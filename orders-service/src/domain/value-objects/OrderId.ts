/**
 * OrderId Value Object
 * Immutable identifier for orders
 */
export class OrderId {
  private readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('OrderId cannot be empty');
    }
    this.value = value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: OrderId): boolean {
    return this.value === other.value;
  }

  static generate(): OrderId {
    return new OrderId(crypto.randomUUID());
  }
}

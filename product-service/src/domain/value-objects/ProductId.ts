/**
 * ProductId Value Object
 * Immutable identifier for products
 */
export class ProductId {
  private readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ProductId cannot be empty');
    }
    this.value = value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: ProductId): boolean {
    return this.value === other.value;
  }

  static generate(): ProductId {
    return new ProductId(crypto.randomUUID());
  }
}

/**
 * Base Domain Error
 * All domain-specific errors should extend this
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ProductNotFoundError extends DomainError {
  constructor(productId: string) {
    super(`Product with id ${productId} not found`, 'PRODUCT_NOT_FOUND');
  }
}

export class InsufficientStockError extends DomainError {
  constructor(productId: string, requested: number, available: number) {
    super(
      `Insufficient stock for product ${productId}. Requested: ${requested}, Available: ${available}`,
      'INSUFFICIENT_STOCK'
    );
  }
}

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

export class OrderNotFoundError extends DomainError {
  constructor(orderId: string) {
    super(`Order with id ${orderId} not found`, 'ORDER_NOT_FOUND');
  }
}

export class InvalidOrderStatusTransitionError extends DomainError {
  constructor(currentStatus: string, newStatus: string) {
    super(
      `Invalid order status transition from ${currentStatus} to ${newStatus}`,
      'INVALID_STATUS_TRANSITION'
    );
  }
}

export class InvalidOrderError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_ORDER');
  }
}

export class EmptyOrderError extends DomainError {
  constructor() {
    super('Order must have at least one item', 'EMPTY_ORDER');
  }
}

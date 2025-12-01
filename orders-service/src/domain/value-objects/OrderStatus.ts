/**
 * OrderStatus Value Object
 * Represents the different states an order can be in
 */
export enum OrderStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export class OrderStatus {
  private readonly value: OrderStatusEnum;

  constructor(value: OrderStatusEnum) {
    this.value = value;
  }

  getValue(): OrderStatusEnum {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: OrderStatus): boolean {
    return this.value === other.value;
  }

  isPending(): boolean {
    return this.value === OrderStatusEnum.PENDING;
  }

  isConfirmed(): boolean {
    return this.value === OrderStatusEnum.CONFIRMED;
  }

  isCancelled(): boolean {
    return this.value === OrderStatusEnum.CANCELLED;
  }

  isFailed(): boolean {
    return this.value === OrderStatusEnum.FAILED;
  }

  canTransitionTo(newStatus: OrderStatus): boolean {
    const transitions: Record<OrderStatusEnum, OrderStatusEnum[]> = {
      [OrderStatusEnum.PENDING]: [
        OrderStatusEnum.CONFIRMED,
        OrderStatusEnum.CANCELLED,
        OrderStatusEnum.FAILED,
      ],
      [OrderStatusEnum.CONFIRMED]: [OrderStatusEnum.PROCESSING, OrderStatusEnum.CANCELLED],
      [OrderStatusEnum.PROCESSING]: [OrderStatusEnum.SHIPPED, OrderStatusEnum.CANCELLED],
      [OrderStatusEnum.SHIPPED]: [OrderStatusEnum.DELIVERED],
      [OrderStatusEnum.DELIVERED]: [],
      [OrderStatusEnum.CANCELLED]: [],
      [OrderStatusEnum.FAILED]: [],
    };

    return transitions[this.value]?.includes(newStatus.getValue()) ?? false;
  }

  static pending(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.PENDING);
  }

  static confirmed(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.CONFIRMED);
  }

  static cancelled(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.CANCELLED);
  }

  static failed(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.FAILED);
  }
}

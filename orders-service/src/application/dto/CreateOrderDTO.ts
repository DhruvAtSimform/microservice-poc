/**
 * Data Transfer Object for creating an order
 */
export interface CreateOrderDTO {
  customerId: string;
  items: OrderItemDTO[];
}

export interface OrderItemDTO {
  productId: string;
  quantity: number;
}

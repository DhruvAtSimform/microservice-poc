/**
 * Data Transfer Object for order response
 */
export interface OrderResponseDTO {
  id: string;
  customerId: string;
  items: OrderItemResponseDTO[];
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemResponseDTO {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

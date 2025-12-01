import { Order } from '@domain/entities/Order.js';
import { OrderResponseDTO, OrderItemResponseDTO } from '@application/dto/OrderResponseDTO.js';
import { IOrderRepository } from '@domain/interfaces/IOrderRepository.js';

/**
 * Get Orders By Customer ID Use Case
 * Retrieves all orders for a specific customer
 */
export class GetOrdersByCustomerUseCase {
  constructor(private orderRepository: IOrderRepository) {}

  async execute(customerId: string): Promise<OrderResponseDTO[]> {
    const orders = await this.orderRepository.findByCustomerId(customerId);
    return orders.map((order) => this.toDTO(order));
  }

  private toDTO(order: Order): OrderResponseDTO {
    const items: OrderItemResponseDTO[] = order.items.map((item) => ({
      productId: item.getProductId(),
      productName: item.getProductName(),
      quantity: item.getQuantity(),
      unitPrice: item.getUnitPrice().getAmount(),
      subtotal: item.getSubtotal().getAmount(),
    }));

    return {
      id: order.id.toString(),
      customerId: order.customerId,
      items,
      status: order.status.toString(),
      total: order.total.getAmount(),
      currency: order.total.getCurrency(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}

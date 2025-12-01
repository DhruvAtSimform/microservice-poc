import { Order } from '@domain/entities/Order.js';
import { OrderId } from '@domain/value-objects/OrderId.js';
import { OrderNotFoundError } from '@shared/errors/DomainError.js';
import { OrderResponseDTO, OrderItemResponseDTO } from '@application/dto/OrderResponseDTO.js';
import { IOrderRepository } from '@domain/interfaces/IOrderRepository.js';

/**
 * Get Order By ID Use Case
 * Retrieves an order by its unique identifier
 */
export class GetOrderByIdUseCase {
  constructor(private orderRepository: IOrderRepository) {}

  async execute(orderId: string): Promise<OrderResponseDTO> {
    const id = new OrderId(orderId);
    const order = await this.orderRepository.findById(id);

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    return this.toDTO(order);
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

import { Order } from '@domain/entities/Order.js';
import { CreateOrderDTO } from '@application/dto/CreateOrderDTO.js';
import { OrderResponseDTO, OrderItemResponseDTO } from '@application/dto/OrderResponseDTO.js';
import { CreateOrderSaga } from '@application/sagas/CreateOrderSaga.js';

/**
 * Create Order Use Case
 * Orchestrates the creation of a new order using SAGA pattern
 */
export class CreateOrderUseCase {
  constructor(private createOrderSaga: CreateOrderSaga) {}

  async execute(dto: CreateOrderDTO): Promise<OrderResponseDTO> {
    // Execute the SAGA
    const order = await this.createOrderSaga.execute(dto.customerId, dto.items);

    // Return DTO with PENDING status
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

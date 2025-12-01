import { ProductId } from '@domain/value-objects/ProductId.js';
import { ReserveProductCommand } from '@application/commands/ReserveProductCommand.js';
import { ReleaseInventoryCommand } from '@application/commands/ReleaseInventoryCommand.js';
import { InventoryReservedEvent } from '@domain/events/InventoryReservedEvent.js';
import { InventoryReservationFailedEvent } from '@domain/events/InventoryReservationFailedEvent.js';
import { InventoryReleasedEvent } from '@domain/events/InventoryReleasedEvent.js';
import { productRepository, eventPublisher } from '@infrastructure/instances.js';

/**
 * Product Reservation Saga Handler
 * Handles product reservation as part of order SAGA
 * Publishes feedback events to order-feedback queue
 */
export class ProductReservationSaga {
  private reservations: Map<string, ReservationInfo> = new Map();

  /**
   * Execute reservation - Forward transaction
   */
  async executeReservation(command: ReserveProductCommand): Promise<void> {
    const reservationId = this.generateReservationId(command.orderId, command.productId);

    try {
      console.log(`🔒 Reserving inventory for order ${command.orderId}...`);

      const productId = new ProductId(command.productId);
      const product = await productRepository.findById(productId);

      if (!product) {
        throw new Error('Product not found');
      }

      if (!product.canFulfillOrder(command.quantity)) {
        // Publish failure event to feedback queue
        const failedEvent = new InventoryReservationFailedEvent(
          command.orderId,
          command.productId,
          command.quantity,
          'Cannot fulfill order - insufficient stock or inactive product'
        );
        await eventPublisher.publish(failedEvent);

        throw new Error('Cannot fulfill order - insufficient stock or inactive product');
      }

      // Reserve stock
      product.updateStock(-command.quantity);
      await productRepository.update(product);

      // Store reservation info for potential compensation
      this.reservations.set(reservationId, {
        orderId: command.orderId,
        productId: command.productId,
        quantity: command.quantity,
        timestamp: new Date(),
      });

      // Publish success event to feedback queue
      const reservedEvent = new InventoryReservedEvent(
        command.orderId,
        command.productId,
        command.quantity,
        reservationId
      );
      await eventPublisher.publish(reservedEvent);

      console.log(`✅ Inventory reserved: ${reservationId}`);
    } catch (error) {
      console.error('Failed to reserve inventory:', error);

      // Publish failure event if not already published
      if (error instanceof Error && !error.message.includes('Cannot fulfill')) {
        const failedEvent = new InventoryReservationFailedEvent(
          command.orderId,
          command.productId,
          command.quantity,
          error.message
        );
        await eventPublisher.publish(failedEvent);
      }

      throw error;
    }
  }

  /**
   * Compensate reservation - Rollback transaction
   * Called when order is cancelled or payment fails
   */
  async compensateReservation(command: ReleaseInventoryCommand): Promise<void> {
    const reservationId =
      command.reservationId || this.generateReservationId(command.orderId, command.productId);

    try {
      console.log(`🔓 Releasing inventory reservation: ${reservationId}`);

      const productId = new ProductId(command.productId);
      const product = await productRepository.findById(productId);

      if (!product) {
        throw new Error('Product not found for compensation');
      }

      // Restore stock
      product.updateStock(command.quantity);
      await productRepository.update(product);

      // Remove reservation record
      this.reservations.delete(reservationId);

      // Publish inventory released event to feedback queue
      const releasedEvent = new InventoryReleasedEvent(
        command.orderId,
        command.productId,
        command.quantity,
        reservationId,
        command.reason
      );
      await eventPublisher.publish(releasedEvent);

      console.log(`✅ Inventory released: ${reservationId}`);
    } catch (error) {
      console.error('Failed to compensate reservation:', error);
      throw error;
    }
  }

  /**
   * Generate unique reservation ID
   */
  private generateReservationId(orderId: string, productId: string): string {
    return `RES-${orderId}-${productId}-${Date.now()}`;
  }

  /**
   * Get reservation info
   */
  getReservation(reservationId: string): ReservationInfo | undefined {
    return this.reservations.get(reservationId);
  }
}

/**
 * Reservation information
 */
interface ReservationInfo {
  orderId: string;
  productId: string;
  quantity: number;
  timestamp: Date;
}

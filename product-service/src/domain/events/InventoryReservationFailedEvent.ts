import { DomainEvent } from './DomainEvent.js';

/**
 * Inventory Reservation Failed Event
 * Published when inventory reservation fails (insufficient stock, inactive product, etc.)
 */
export class InventoryReservationFailedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly reason: string
  ) {
    super('inventory.reservation.failed', productId);
  }

  toPayload(): Record<string, unknown> {
    return {
      eventType: this.eventType,
      eventId: this.eventId,
      occurredOn: this.occurredOn,
      orderId: this.orderId,
      productId: this.productId,
      quantity: this.quantity,
      reason: this.reason,
    };
  }

  toJSON() {
    return this.toPayload();
  }
}

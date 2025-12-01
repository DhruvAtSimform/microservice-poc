import { DomainEvent } from './DomainEvent.js';

/**
 * Inventory Released Event
 * Published when previously reserved inventory is released (compensation action)
 */
export class InventoryReleasedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly reservationId: string,
    public readonly reason: string
  ) {
    super('inventory.released', productId);
  }

  toPayload(): Record<string, unknown> {
    return {
      eventType: this.eventType,
      eventId: this.eventId,
      occurredOn: this.occurredOn,
      orderId: this.orderId,
      productId: this.productId,
      quantity: this.quantity,
      reservationId: this.reservationId,
      reason: this.reason,
    };
  }

  toJSON() {
    return this.toPayload();
  }
}

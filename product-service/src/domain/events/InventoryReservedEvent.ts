import { DomainEvent } from './DomainEvent.js';

/**
 * Inventory Reserved Event
 * Published when inventory is successfully reserved for an order
 */
export class InventoryReservedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly reservationId: string
  ) {
    super('inventory.reserved', productId);
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
    };
  }

  toJSON() {
    return this.toPayload();
  }
}

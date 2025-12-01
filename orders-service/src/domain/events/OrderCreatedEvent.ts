import { DomainEvent } from '@domain/events/DomainEvent.js';

export class OrderCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly customerId: string,
    public readonly items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>,
    public readonly total: number,
    public readonly currency: string
  ) {
    super('OrderCreated', aggregateId);
  }

  toPayload(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      customerId: this.customerId,
      items: this.items,
      total: this.total,
      currency: this.currency,
    };
  }
}

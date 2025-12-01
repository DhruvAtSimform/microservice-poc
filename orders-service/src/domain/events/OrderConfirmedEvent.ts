import { DomainEvent } from '@domain/events/DomainEvent.js';

export class OrderConfirmedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly customerId: string
  ) {
    super('OrderConfirmed', aggregateId);
  }

  toPayload(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      customerId: this.customerId,
    };
  }
}

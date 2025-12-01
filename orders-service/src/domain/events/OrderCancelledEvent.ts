import { DomainEvent } from '@domain/events/DomainEvent.js';

export class OrderCancelledEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly customerId: string,
    public readonly reason: string
  ) {
    super('OrderCancelled', aggregateId);
  }

  toPayload(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      customerId: this.customerId,
      reason: this.reason,
    };
  }
}

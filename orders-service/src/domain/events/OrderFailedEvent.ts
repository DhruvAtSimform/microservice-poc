import { DomainEvent } from '@domain/events/DomainEvent.js';

export class OrderFailedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly customerId: string,
    public readonly reason: string
  ) {
    super('OrderFailed', aggregateId);
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

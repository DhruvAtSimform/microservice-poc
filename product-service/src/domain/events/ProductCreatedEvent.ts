import { DomainEvent } from '@domain/events/DomainEvent.js';

export class ProductCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly name: string,
    public readonly price: number,
    public readonly stock: number
  ) {
    super('ProductCreated', aggregateId);
  }

  toPayload(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      name: this.name,
      price: this.price,
      stock: this.stock,
    };
  }
}

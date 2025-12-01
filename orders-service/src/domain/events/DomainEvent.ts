/**
 * Base Domain Event
 * All domain events should extend this
 */
export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;

  constructor(
    public readonly eventType: string,
    public readonly aggregateId: string
  ) {
    this.occurredOn = new Date();
    this.eventId = crypto.randomUUID();
  }

  abstract toPayload(): Record<string, unknown>;
}

import { DomainEvent } from './DomainEvent.js';

/**
 * Order Compensation Requested Event
 * Published when an order needs to be rolled back/compensated
 */
export class OrderCompensationRequestedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly reason: string,
    public readonly affectedServices: string[]
  ) {
    super('order.compensation.requested', orderId);
  }

  toPayload(): Record<string, unknown> {
    return {
      eventType: this.eventType,
      eventId: this.eventId,
      occurredOn: this.occurredOn,
      orderId: this.orderId,
      customerId: this.customerId,
      reason: this.reason,
      affectedServices: this.affectedServices,
    };
  }

  toJSON() {
    return this.toPayload();
  }
}

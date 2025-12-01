import { DomainEvent } from '@domain/events/DomainEvent.js';

/**
 * Event Publisher Interface (Port)
 * Defines the contract for publishing domain events
 * Implementation will be in the infrastructure layer
 */
export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
}

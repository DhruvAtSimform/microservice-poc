import { IEventPublisher } from '@domain/interfaces/IEventPublisher.js';
import { DomainEvent } from '@domain/events/DomainEvent.js';

/**
 * In-Memory Event Publisher Implementation
 * Adapter implementing the event publisher port
 * For production, replace with message broker (RabbitMQ, Kafka, etc.)
 */
export class InMemoryEventPublisher implements IEventPublisher {
  private events: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    console.log('📢 Publishing event:', event.toPayload());
    this.events.push(event);
    // In production, this would publish to a message broker
    await Promise.resolve();
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  // Helper method for testing
  getPublishedEvents(): DomainEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}

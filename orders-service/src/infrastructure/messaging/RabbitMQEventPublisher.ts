import { IEventPublisher } from '@domain/interfaces/IEventPublisher.js';
import { DomainEvent } from '@domain/events/DomainEvent.js';
import { RabbitMQService } from '@infrastructure/messaging/RabbitMQService.js';
import { RabbitMQConfig } from '@infrastructure/config/rabbitmq.config.js';

/**
 * RabbitMQ Event Publisher Implementation
 * Adapter implementing the event publisher port using RabbitMQ
 */
export class RabbitMQEventPublisher implements IEventPublisher {
  constructor(
    private rabbitMQService: RabbitMQService,
    private config: RabbitMQConfig
  ) {}

  /**
   * Publish a single domain event to RabbitMQ
   */
  async publish(event: DomainEvent): Promise<void> {
    try {
      const routingKey = this.getRoutingKey(event.eventType);
      const exchange = this.getExchange(event.eventType);

      console.log(`📢 Publishing event: ${event.eventType} to ${exchange}/${routingKey}`);

      await this.rabbitMQService.publish(exchange, routingKey, event.toPayload());
    } catch (error) {
      console.error(`❌ Failed to publish event ${event.eventType}:`, error);
      throw error;
    }
  }

  /**
   * Publish multiple domain events to RabbitMQ
   */
  async publishMany(events: DomainEvent[]): Promise<void> {
    try {
      // Publish events sequentially to maintain order
      for (const event of events) {
        await this.publish(event);
      }
    } catch (error) {
      console.error('❌ Failed to publish batch of events:', error);
      throw error;
    }
  }

  /**
   * Determine the exchange based on event type
   */
  private getExchange(eventType: string): string {
    if (eventType.startsWith('order.')) {
      return this.config.exchanges.orders;
    } else if (eventType.startsWith('product.')) {
      return this.config.exchanges.products;
    }

    // Default to orders exchange
    return this.config.exchanges.orders;
  }

  /**
   * Get routing key for event type
   */
  private getRoutingKey(eventType: string): string {
    const routingKeyMap: Record<string, string> = {
      'order.created': this.config.routingKeys.orderCreated,
      'order.confirmed': this.config.routingKeys.orderConfirmed,
      'order.cancelled': this.config.routingKeys.orderCancelled,
      'order.failed': this.config.routingKeys.orderFailed,
      'product.created': this.config.routingKeys.productCreated,
      'product.updated': this.config.routingKeys.productUpdated,
    };

    return routingKeyMap[eventType] || eventType;
  }
}

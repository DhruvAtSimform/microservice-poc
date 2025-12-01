import { BaseEventConsumer } from '@infrastructure/messaging/BaseEventConsumer.js';
import { RabbitMQService } from '@infrastructure/messaging/RabbitMQService.js';
import { RabbitMQConfig } from '@infrastructure/config/rabbitmq.config.js';
import { ProductReservationSaga } from '@application/sagas/ProductReservationSaga.js';
import { ReleaseInventoryCommand as _ReleaseInventoryCommand } from '@application/commands/ReleaseInventoryCommand.js';

/**
 * Product Events Consumer
 * Consumes and processes product-related events from RabbitMQ
 * Listens to order events and processes compensation requests
 */
export class ProductEventsConsumer extends BaseEventConsumer {
  private reservationSaga: ProductReservationSaga;

  constructor(rabbitMQService: RabbitMQService, config: RabbitMQConfig) {
    super(rabbitMQService, config);
    this.reservationSaga = new ProductReservationSaga();
  }

  /**
   * Setup subscriptions to order event queues
   */
  protected async setupSubscriptions(): Promise<void> {
    // Subscribe to order events queue to listen for order updates
    await this.subscribeToOrderEvents();

    // Subscribe to order-feedback queue to listen for compensation requests
    await this.subscribeToOrderFeedback();
  }

  /**
   * Subscribe to order events
   * Product service might need to know about order changes
   */
  private async subscribeToOrderEvents(): Promise<void> {
    const queue = this.config.queues.orderEvents;

    console.log(`📥 Subscribing to order events queue: ${queue}`);

    await this.rabbitMQService.subscribe(
      queue,
      async (message: unknown) => {
        await this.handleOrderEvent(message);
      },
      {
        autoAck: false,
        prefetch: 10,
        durable: true,
      }
    );

    // Bind queue to orders exchange for relevant routing keys
    await this.rabbitMQService.bindQueue(queue, this.config.exchanges.orders, 'order.*');
  }

  /**
   * Handle order events
   */
  private async handleOrderEvent(message: unknown): Promise<void> {
    try {
      console.log('📨 Received order event:', message);

      const event = message as { eventType: string; payload: unknown };

      await this.handleEvent(event.eventType, event.payload);
    } catch (error) {
      console.error('❌ Error handling order event:', error);
      throw error;
    }
  }

  /**
   * Handle incoming event based on type
   */
  protected async handleEvent(eventType: string, payload: unknown): Promise<void> {
    console.log(`🔔 Processing event: ${eventType}`);

    switch (eventType) {
      case 'order.created':
        await this.handleOrderCreated(payload);
        break;

      case 'order.confirmed':
        await this.handleOrderConfirmed(payload);
        break;

      default:
        console.log(`⚠️  Unhandled event type: ${eventType}`);
    }
  }

  /**
   * Handle order created event
   * This might trigger inventory reservation
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async handleOrderCreated(payload: unknown): Promise<void> {
    console.log('✅ Order created event processed:', payload);
    // TODO: Implement order created logic
    // For example, reserve inventory for the order
  }

  /**
   * Handle order confirmed event
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async handleOrderConfirmed(payload: unknown): Promise<void> {
    console.log('✅ Order confirmed event processed:', payload);
    // TODO: Implement order confirmed logic
    // For example, commit inventory reservation
  }

  /**
   * Subscribe to order-feedback queue
   * This is where compensation requests are sent
   */
  private async subscribeToOrderFeedback(): Promise<void> {
    const queue = this.config.queues.orderFeedback;

    console.log(`📥 Subscribing to order-feedback queue: ${queue}`);

    await this.rabbitMQService.subscribe(
      queue,
      async (message: unknown) => {
        await this.handleCompensationEvent(message);
      },
      {
        autoAck: false,
        prefetch: 10,
        durable: true,
      }
    );

    // Bind queue to orders exchange for compensation routing key
    await this.rabbitMQService.bindQueue(
      queue,
      this.config.exchanges.orders,
      this.config.routingKeys.orderCompensation
    );
  }

  /**
   * Handle compensation events (reverse saga)
   */
  private async handleCompensationEvent(message: unknown): Promise<void> {
    try {
      console.log('📨 Received compensation event:', message);

      const event = message as { eventType: string; payload: unknown };

      switch (event.eventType) {
        case 'order.compensation.requested':
          await this.handleOrderCompensation(event.payload);
          break;

        default:
          console.log(`⚠️  Unhandled compensation event: ${event.eventType}`);
      }
    } catch (error) {
      console.error('❌ Error handling compensation event:', error);
      throw error;
    }
  }

  /**
   * Handle order compensation request
   * Release reserved inventory for the order
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async handleOrderCompensation(payload: unknown): Promise<void> {
    const data = payload as { orderId: string; reason?: string; affectedServices?: string[] };
    const { orderId, reason = 'Unknown', affectedServices = [] } = data;

    console.log(`🔄 Processing compensation for order ${orderId}. Reason: ${reason}`);

    // Check if inventory service needs to compensate
    if (affectedServices.includes('inventory')) {
      // Get order details and release inventory for all items
      // In a real system, you'd fetch order items from the order service or event payload
      // For now, we'll need the order details passed in the payload

      // Example: Release inventory for each product in the order
      // This would typically require storing reservation info or fetching order details
      console.log(`🔓 Releasing inventory for order ${orderId}...`);

      // The actual release would be done via the saga
      // In a complete implementation, you'd have order item details in the payload
    }
  }
}

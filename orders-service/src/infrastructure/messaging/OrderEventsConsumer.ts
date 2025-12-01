import { BaseEventConsumer } from '@infrastructure/messaging/BaseEventConsumer.js';
import { RabbitMQService } from '@infrastructure/messaging/RabbitMQService.js';
import { RabbitMQConfig } from '@infrastructure/config/rabbitmq.config.js';
import { CreateOrderSaga } from '@application/sagas/CreateOrderSaga.js';

/**
 * Order Events Consumer
 * Consumes and processes order-related events from RabbitMQ
 * Listens to order-feedback queue for inventory reservation results
 */
export class OrderEventsConsumer extends BaseEventConsumer {
  constructor(
    rabbitMQService: RabbitMQService,
    config: RabbitMQConfig,
    private orderSaga?: CreateOrderSaga
  ) {
    super(rabbitMQService, config);
  }

  /**
   * Set the order saga instance (for dependency injection)
   */
  setOrderSaga(saga: CreateOrderSaga): void {
    this.orderSaga = saga;
  }

  /**
   * Setup subscriptions to order event queues
   */
  protected async setupSubscriptions(): Promise<void> {
    // Subscribe to product events queue to listen for product updates
    await this.subscribeToProductEvents();

    // Subscribe to order-feedback queue to listen for inventory reservation results
    await this.subscribeToOrderFeedback();
  }

  /**
   * Subscribe to product events
   * Orders service needs to know about product changes
   */
  private async subscribeToProductEvents(): Promise<void> {
    const queue = this.config.queues.productEvents;

    console.log(`📥 Subscribing to product events queue: ${queue}`);

    await this.rabbitMQService.subscribe(
      queue,
      async (message: unknown) => {
        await this.handleProductEvent(message);
      },
      {
        autoAck: false,
        prefetch: 10,
        durable: true,
      }
    );

    // Bind queue to products exchange for relevant routing keys
    await this.rabbitMQService.bindQueue(queue, this.config.exchanges.products, 'product.*');
  }

  /**
   * Handle product events
   */
  private async handleProductEvent(message: unknown): Promise<void> {
    try {
      console.log('📨 Received product event:', message);

      const event = message as { eventType: string; payload: unknown };

      await this.handleEvent(event.eventType, event.payload);
    } catch (error) {
      console.error('❌ Error handling product event:', error);
      throw error;
    }
  }

  /**
   * Handle incoming event based on type
   */
  protected async handleEvent(eventType: string, payload: unknown): Promise<void> {
    console.log(`🔔 Processing event: ${eventType}`);

    switch (eventType) {
      case 'product.created':
        await this.handleProductCreated(payload);
        break;

      case 'product.updated':
        await this.handleProductUpdated(payload);
        break;

      default:
        console.log(`⚠️  Unhandled event type: ${eventType}`);
    }
  }

  /**
   * Handle product created event
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async handleProductCreated(payload: unknown): Promise<void> {
    console.log('✅ Product created event processed:', payload);
    // TODO: Implement product created logic if needed
    // For example, cache product information locally
  }

  /**
   * Handle product updated event
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async handleProductUpdated(payload: unknown): Promise<void> {
    console.log('✅ Product updated event processed:', payload);
    // TODO: Implement product updated logic if needed
    // For example, update cached product information
  }

  /**
   * Subscribe to order-feedback queue
   * This is where inventory service sends reservation results
   */
  private async subscribeToOrderFeedback(): Promise<void> {
    const queue = this.config.queues.orderFeedback;

    console.log(`📥 Subscribing to order-feedback queue: ${queue}`);

    await this.rabbitMQService.subscribe(
      queue,
      async (message: unknown) => {
        await this.handleFeedbackEvent(message);
      },
      {
        autoAck: false,
        prefetch: 10,
        durable: true,
      }
    );

    // Bind queue to feedback exchange for inventory-related routing keys
    await this.rabbitMQService.bindQueue(
      queue,
      this.config.exchanges.feedback,
      this.config.routingKeys.inventoryReserved
    );
    await this.rabbitMQService.bindQueue(
      queue,
      this.config.exchanges.feedback,
      this.config.routingKeys.inventoryReservationFailed
    );
    await this.rabbitMQService.bindQueue(
      queue,
      this.config.exchanges.feedback,
      this.config.routingKeys.inventoryReleased
    );
  }

  /**
   * Handle feedback events from downstream services
   */
  private async handleFeedbackEvent(message: unknown): Promise<void> {
    try {
      console.log('📨 Received feedback event:', message);

      const event = message as { eventType: string; payload: unknown };

      // Forward to saga orchestrator for handling
      if (this.orderSaga) {
        await this.orderSaga.handleFeedbackEvent(event.eventType, event.payload);
      } else {
        console.warn('⚠️  OrderSaga not initialized, cannot process feedback event');
      }
    } catch (error) {
      console.error('❌ Error handling feedback event:', error);
      throw error;
    }
  }
}

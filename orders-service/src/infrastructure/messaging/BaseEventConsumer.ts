import { RabbitMQService } from '@infrastructure/messaging/RabbitMQService.js';
import { RabbitMQConfig } from '@infrastructure/config/rabbitmq.config.js';

/**
 * Event Consumer Interface
 * Defines the contract for event consumers
 */
export interface IEventConsumer {
  /**
   * Start consuming events
   */
  start(): Promise<void>;

  /**
   * Stop consuming events
   */
  stop(): Promise<void>;
}

/**
 * Base Event Consumer
 * Base class for consuming events from RabbitMQ queues
 */
export abstract class BaseEventConsumer implements IEventConsumer {
  protected isRunning = false;

  constructor(
    protected rabbitMQService: RabbitMQService,
    protected config: RabbitMQConfig
  ) {}

  /**
   * Start consuming events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Event consumer already running');
      return;
    }

    console.log('🎧 Starting event consumer...');

    try {
      await this.setupSubscriptions();
      this.isRunning = true;
      console.log('✅ Event consumer started successfully');
    } catch (error) {
      console.error('❌ Failed to start event consumer:', error);
      throw error;
    }
  }

  /**
   * Stop consuming events
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️  Event consumer not running');
      return;
    }

    console.log('🛑 Stopping event consumer...');
    this.isRunning = false;
    console.log('✅ Event consumer stopped');
  }

  /**
   * Setup subscriptions to queues
   * Must be implemented by subclasses
   */
  protected abstract setupSubscriptions(): Promise<void>;

  /**
   * Handle incoming event
   * Must be implemented by subclasses
   */
  protected abstract handleEvent(eventType: string, payload: unknown): Promise<void>;
}

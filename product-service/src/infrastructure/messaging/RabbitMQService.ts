import { IMessageQueue, SubscribeOptions } from '@domain/interfaces/IMessageQueue.js';
import { RabbitMQConfig } from '@infrastructure/config/rabbitmq.config.js';
import * as amqp from 'amqplib';

/**
 * RabbitMQ Message Queue Implementation
 * Adapter implementing the message queue port using RabbitMQ
 */
export class RabbitMQService implements IMessageQueue {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private connected = false;

  constructor(private config: RabbitMQConfig) {}

  /**
   * Connect to RabbitMQ server
   */
  async connect(): Promise<void> {
    try {
      console.log(`🔌 Connecting to RabbitMQ at ${this.config.url}...`);

      this.connection = await amqp.connect(this.config.url);
      this.channel = await this.connection.createChannel();

      // Setup exchanges
      await this.setupExchanges();

      this.connected = true;
      console.log('✅ Connected to RabbitMQ successfully');

      // Setup connection error handlers
      this.connection.on('error', (err: Error) => {
        console.error('❌ RabbitMQ connection error:', err);
        this.connected = false;
      });

      this.connection.on('close', () => {
        console.log('🔌 RabbitMQ connection closed');
        this.connected = false;
      });
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error);
      console.log('⚠️  Application will continue without RabbitMQ messaging');
      this.connected = false;
      // Don't throw error to allow application to start even if RabbitMQ is not available
    }
  }

  /**
   * Setup exchanges for the service
   */
  private async setupExchanges(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    // Create topic exchanges for orders, products, and feedback
    await this.channel.assertExchange(this.config.exchanges.orders, 'topic', {
      durable: true,
    });

    await this.channel.assertExchange(this.config.exchanges.products, 'topic', {
      durable: true,
    });

    await this.channel.assertExchange(this.config.exchanges.feedback, 'topic', {
      durable: true,
    });

    console.log('📢 Exchanges setup completed');
  }

  /**
   * Disconnect from RabbitMQ
   */
  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.connected = false;
      console.log('👋 Disconnected from RabbitMQ');
    } catch (error) {
      console.error('❌ Error disconnecting from RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Publish a message to an exchange with routing key
   */
  async publish(exchange: string, routingKey: string, message: unknown): Promise<void> {
    try {
      if (!this.connected) {
        console.warn('⚠️  RabbitMQ not connected, message not published');
        console.log('📨 Would publish:', { exchange, routingKey, message });
        return;
      }

      if (!this.channel) {
        throw new Error('Channel not initialized');
      }

      const messageBuffer = Buffer.from(JSON.stringify(message));
      await Promise.resolve(
        this.channel.publish(exchange, routingKey, messageBuffer, {
          persistent: true,
          contentType: 'application/json',
        })
      );

      console.log(`📤 Published message to ${exchange}/${routingKey}`);
    } catch (error) {
      console.error('❌ Failed to publish message:', error);
      throw error;
    }
  }

  /**
   * Subscribe to a queue and handle incoming messages
   */
  async subscribe(
    queue: string,
    handler: (message: unknown) => Promise<void>,
    options: SubscribeOptions = {}
  ): Promise<void> {
    try {
      if (!this.connected) {
        console.warn(`⚠️  RabbitMQ not connected, cannot subscribe to ${queue}`);
        console.log(`📥 Would subscribe to queue: ${queue}`);
        return;
      }

      if (!this.channel) {
        throw new Error('Channel not initialized');
      }

      const { autoAck = false, prefetch = 10, durable = true } = options;

      // Assert the queue exists
      await this.channel.assertQueue(queue, {
        durable,
      });

      // Set prefetch count
      await this.channel.prefetch(prefetch);

      // Consume messages
      await this.channel.consume(
        queue,
        (msg) => {
          if (!msg) return;

          void (async () => {
            try {
              const content = JSON.parse(msg.content.toString()) as unknown;
              await handler(content);

              if (!autoAck && this.channel) {
                this.channel.ack(msg);
              }
            } catch (error) {
              console.error(`Error processing message from ${queue}:`, error);
              if (!autoAck && this.channel) {
                this.channel.nack(msg, false, false);
              }
            }
          })();
        },
        {
          noAck: autoAck,
        }
      );

      console.log(`📥 Subscribed to queue: ${queue}`);
    } catch (error) {
      console.error(`❌ Failed to subscribe to queue ${queue}:`, error);
      throw error;
    }
  }

  /**
   * Check if connected to RabbitMQ
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Bind a queue to an exchange with a routing key
   */
  async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
    try {
      if (!this.connected) {
        console.warn(`⚠️  RabbitMQ not connected, cannot bind queue ${queue}`);
        return;
      }

      if (!this.channel) {
        throw new Error('Channel not initialized');
      }

      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.bindQueue(queue, exchange, routingKey);

      console.log(`🔗 Bound queue ${queue} to ${exchange} with routing key ${routingKey}`);
    } catch (error) {
      console.error(`❌ Failed to bind queue ${queue}:`, error);
      throw error;
    }
  }
}

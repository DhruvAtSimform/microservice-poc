/**
 * Message Queue Interface (Port)
 * Defines the contract for message queue operations
 * Implementation will be in the infrastructure layer
 */
export interface IMessageQueue {
  /**
   * Connect to the message queue
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the message queue
   */
  disconnect(): Promise<void>;

  /**
   * Publish a message to a queue/exchange
   */
  publish(exchange: string, routingKey: string, message: unknown): Promise<void>;

  /**
   * Subscribe to a queue and handle messages
   */
  subscribe(
    queue: string,
    handler: (message: unknown) => Promise<void>,
    options?: SubscribeOptions
  ): Promise<void>;

  /**
   * Check if connected
   */
  isConnected(): boolean;
}

/**
 * Subscribe options for queue consumption
 */
export interface SubscribeOptions {
  /**
   * Acknowledge messages automatically
   */
  autoAck?: boolean;

  /**
   * Number of messages to prefetch
   */
  prefetch?: number;

  /**
   * Durable queue
   */
  durable?: boolean;
}

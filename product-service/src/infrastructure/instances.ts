/**
 * Singleton Instances
 * Central file to export all singleton instances to avoid circular dependencies
 */

import { PrismaProductRepository } from '@infrastructure/persistence/PrismaProductRepository.js';
import { InMemoryEventPublisher } from '@infrastructure/messaging/InMemoryEventPublisher.js';
import { RabbitMQService } from '@infrastructure/messaging/RabbitMQService.js';
import { RabbitMQEventPublisher as _RabbitMQEventPublisher } from '@infrastructure/messaging/RabbitMQEventPublisher.js';
import { ProductEventsConsumer } from '@infrastructure/messaging/ProductEventsConsumer.js';
import { loadRabbitMQConfig } from '@infrastructure/config/rabbitmq.config.js';

// Configuration
const rabbitMQConfig = loadRabbitMQConfig();

/**
 * Repository instances
 */
export const productRepository = new PrismaProductRepository();

/**
 * RabbitMQ Service
 */
export const rabbitMQService = new RabbitMQService(rabbitMQConfig);

/**
 * Event publisher instances
 * Use InMemoryEventPublisher by default
 * To use RabbitMQ, switch to: export const eventPublisher = new RabbitMQEventPublisher(rabbitMQService, rabbitMQConfig);
 */
export const eventPublisher = new InMemoryEventPublisher();

// Alternative RabbitMQ Event Publisher (commented out for now)
// export const eventPublisher = new RabbitMQEventPublisher(rabbitMQService, rabbitMQConfig);

/**
 * Event Consumers
 */
export const productEventsConsumer = new ProductEventsConsumer(rabbitMQService, rabbitMQConfig);

/**
 * Initialize RabbitMQ connection and start event consumers
 * Call this function when starting the application
 */
export async function initializeMessaging(): Promise<void> {
  try {
    console.log('🔌 Initializing messaging infrastructure...');

    // Connect to RabbitMQ
    await rabbitMQService.connect();

    // Start event consumers
    await productEventsConsumer.start();

    console.log('✅ Messaging infrastructure initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize messaging infrastructure:', error);
    // Don't throw error to allow application to start even if RabbitMQ is not available
    console.log('⚠️  Application will continue without RabbitMQ messaging');
  }
}

/**
 * Cleanup RabbitMQ connection on application shutdown
 */
export async function shutdownMessaging(): Promise<void> {
  try {
    console.log('🛑 Shutting down messaging infrastructure...');

    // Stop event consumers
    await productEventsConsumer.stop();

    // Disconnect from RabbitMQ
    await rabbitMQService.disconnect();

    console.log('✅ Messaging infrastructure shut down successfully');
  } catch (error) {
    console.error('❌ Error shutting down messaging infrastructure:', error);
  }
}

/**
 * RabbitMQ Configuration
 * Centralized configuration for RabbitMQ messaging
 */

export interface RabbitMQConfig {
  url: string;
  exchanges: {
    products: string;
    orders: string;
    feedback: string;
  };
  queues: {
    productCreated: string;
    productUpdated: string;
    orderEvents: string;
    orderFeedback: string;
  };
  routingKeys: {
    productCreated: string;
    productUpdated: string;
    orderCreated: string;
    orderConfirmed: string;
    orderCompensation: string;
    inventoryReserved: string;
    inventoryReservationFailed: string;
    inventoryReleased: string;
  };
}

/**
 * Load RabbitMQ configuration from environment variables
 */
export function loadRabbitMQConfig(): RabbitMQConfig {
  return {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    exchanges: {
      products: process.env.RABBITMQ_PRODUCTS_EXCHANGE || 'products.exchange',
      orders: process.env.RABBITMQ_ORDERS_EXCHANGE || 'orders.exchange',
      feedback: process.env.RABBITMQ_FEEDBACK_EXCHANGE || 'order-feedback.exchange',
    },
    queues: {
      productCreated: process.env.RABBITMQ_PRODUCT_CREATED_QUEUE || 'products.created',
      productUpdated: process.env.RABBITMQ_PRODUCT_UPDATED_QUEUE || 'products.updated',
      orderEvents: process.env.RABBITMQ_ORDER_EVENTS_QUEUE || 'order.events',
      orderFeedback: process.env.RABBITMQ_ORDER_FEEDBACK_QUEUE || 'order-feedback',
    },
    routingKeys: {
      productCreated: 'product.created',
      productUpdated: 'product.updated',
      orderCreated: 'order.created',
      orderConfirmed: 'order.confirmed',
      orderCompensation: 'order.compensation.requested',
      inventoryReserved: 'inventory.reserved',
      inventoryReservationFailed: 'inventory.reservation.failed',
      inventoryReleased: 'inventory.released',
    },
  };
}

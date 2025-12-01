/**
 * RabbitMQ Configuration
 * Centralized configuration for RabbitMQ messaging
 */

export interface RabbitMQConfig {
  url: string;
  exchanges: {
    orders: string;
    products: string;
    feedback: string;
  };
  queues: {
    orderCreated: string;
    orderConfirmed: string;
    orderCancelled: string;
    orderFailed: string;
    productEvents: string;
    orderFeedback: string;
  };
  routingKeys: {
    orderCreated: string;
    orderConfirmed: string;
    orderCancelled: string;
    orderFailed: string;
    orderCompensation: string;
    productCreated: string;
    productUpdated: string;
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
      orders: process.env.RABBITMQ_ORDERS_EXCHANGE || 'orders.exchange',
      products: process.env.RABBITMQ_PRODUCTS_EXCHANGE || 'products.exchange',
      feedback: process.env.RABBITMQ_FEEDBACK_EXCHANGE || 'order-feedback.exchange',
    },
    queues: {
      orderCreated: process.env.RABBITMQ_ORDER_CREATED_QUEUE || 'orders.created',
      orderConfirmed: process.env.RABBITMQ_ORDER_CONFIRMED_QUEUE || 'orders.confirmed',
      orderCancelled: process.env.RABBITMQ_ORDER_CANCELLED_QUEUE || 'orders.cancelled',
      orderFailed: process.env.RABBITMQ_ORDER_FAILED_QUEUE || 'orders.failed',
      productEvents: process.env.RABBITMQ_PRODUCT_EVENTS_QUEUE || 'product.events',
      orderFeedback: process.env.RABBITMQ_ORDER_FEEDBACK_QUEUE || 'order-feedback',
    },
    routingKeys: {
      orderCreated: 'order.created',
      orderConfirmed: 'order.confirmed',
      orderCancelled: 'order.cancelled',
      orderFailed: 'order.failed',
      orderCompensation: 'order.compensation.requested',
      productCreated: 'product.created',
      productUpdated: 'product.updated',
      inventoryReserved: 'inventory.reserved',
      inventoryReservationFailed: 'inventory.reservation.failed',
      inventoryReleased: 'inventory.released',
    },
  };
}

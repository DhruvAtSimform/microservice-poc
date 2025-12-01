# RabbitMQ Event-Based Communication

This document describes the RabbitMQ-based event communication infrastructure for the microservices.

## Architecture Overview

The system uses **RabbitMQ** as a message broker to enable event-based communication between services following clean architecture principles:

- **Domain Layer**: Defines `IMessageQueue` interface (port)
- **Infrastructure Layer**: Implements RabbitMQ service, event publishers, and consumers (adapters)
- **Application Layer**: Uses event publishers through domain interfaces

## Configuration

### Environment Variables

Both services require the following RabbitMQ configuration in `.env`:

```env
# RabbitMQ Connection
RABBITMQ_URL="amqp://localhost:5672"

# Exchanges
RABBITMQ_ORDERS_EXCHANGE="orders.exchange"
RABBITMQ_PRODUCTS_EXCHANGE="products.exchange"

# Queues (service-specific)
```

### Orders Service Queues

```env
RABBITMQ_ORDER_CREATED_QUEUE="orders.created"
RABBITMQ_ORDER_CONFIRMED_QUEUE="orders.confirmed"
RABBITMQ_ORDER_CANCELLED_QUEUE="orders.cancelled"
RABBITMQ_ORDER_FAILED_QUEUE="orders.failed"
RABBITMQ_PRODUCT_EVENTS_QUEUE="product.events"
```

### Product Service Queues

```env
RABBITMQ_PRODUCT_CREATED_QUEUE="products.created"
RABBITMQ_PRODUCT_UPDATED_QUEUE="products.updated"
RABBITMQ_ORDER_EVENTS_QUEUE="order.events"
```

## Components

### 1. RabbitMQ Service (`RabbitMQService.ts`)

Core service managing RabbitMQ connections and operations:

- **Connect/Disconnect**: Manage broker connections
- **Publish**: Send messages to exchanges with routing keys
- **Subscribe**: Consume messages from queues
- **Bind Queue**: Bind queues to exchanges with routing patterns

### 2. Event Publisher (`RabbitMQEventPublisher.ts`)

Adapter implementing `IEventPublisher` interface:

- Publishes domain events to appropriate exchanges
- Maps event types to routing keys
- Maintains separation between domain and infrastructure

### 3. Event Consumers

Base consumer class and service-specific implementations:

- **OrderEventsConsumer**: Listens for product events
- **ProductEventsConsumer**: Listens for order events
- Handles message processing with error handling and acknowledgment

## Usage

### Publishing Events

Events are automatically published through the `IEventPublisher` interface:

```typescript
// Domain event is created
const event = new OrderCreatedEvent(orderId, customerId, items);

// Published through infrastructure
await eventPublisher.publish(event);
```

### Consuming Events

Event consumers are started automatically during application bootstrap:

```typescript
// In index.ts
await initializeMessaging();
```

Consumers process events and route them to appropriate handlers:

```typescript
// OrderEventsConsumer handles product events
protected async handleEvent(eventType: string, payload: unknown): Promise<void> {
  switch (eventType) {
    case 'product.created':
      await this.handleProductCreated(payload);
      break;
    // ... other event types
  }
}
```

## Exchange & Routing Strategy

### Topic Exchanges

- `orders.exchange`: All order-related events
- `products.exchange`: All product-related events

### Routing Keys Pattern

- Order events: `order.*` (order.created, order.confirmed, etc.)
- Product events: `product.*` (product.created, product.updated, etc.)

### Queue Bindings

- Orders service subscribes to `product.*` on products exchange
- Product service subscribes to `order.*` on orders exchange

## Enabling RabbitMQ

### Prerequisites

1. Install RabbitMQ locally or use Docker:

   ```bash
   docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
   ```

2. Install amqplib dependency:
   ```bash
   pnpm add amqplib
   pnpm add -D @types/amqplib
   ```

### Switching to RabbitMQ

1. **Uncomment RabbitMQ implementation** in `infrastructure/instances.ts`:

   ```typescript
   // Change from:
   export const eventPublisher = new InMemoryEventPublisher();

   // To:
   export const eventPublisher = new RabbitMQEventPublisher(
     rabbitMQService,
     rabbitMQConfig
   );
   ```

2. **Uncomment RabbitMQ code** in `RabbitMQService.ts`:

   - Uncomment the actual amqplib import and connection code
   - Remove the simulation logs

3. **Start the services**:
   ```bash
   pnpm dev
   ```

## Current State

Currently, the RabbitMQ infrastructure is **defined but not active**:

- ✅ All interfaces and classes are created
- ✅ Configuration is loaded from environment
- ✅ Services use `InMemoryEventPublisher` by default
- ⚠️ RabbitMQ connection is simulated (logs only)
- ⚠️ Actual amqplib code is commented out

This allows the services to run without requiring RabbitMQ to be installed or running.

## Graceful Shutdown

Both services implement graceful shutdown to properly close RabbitMQ connections:

```typescript
process.on("SIGTERM", async () => {
  await shutdownMessaging();
  process.exit(0);
});
```

## Benefits

1. **Clean Architecture**: Infrastructure is completely separated from domain logic
2. **Flexibility**: Easy to switch between InMemory and RabbitMQ implementations
3. **Testability**: Can test without RabbitMQ using in-memory implementation
4. **Resilience**: Application starts even if RabbitMQ is unavailable
5. **Scalability**: Topic exchanges allow flexible routing and multiple consumers

## Next Steps

When ready to use RabbitMQ in production:

1. Set up RabbitMQ cluster for high availability
2. Configure proper authentication and SSL
3. Implement retry logic and dead letter queues
4. Add monitoring and alerting
5. Document message schemas and contracts

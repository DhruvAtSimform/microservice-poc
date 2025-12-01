# Microservices with RabbitMQ - Quick Start Guide

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and pnpm installed
- Terminal/Command prompt

### Step 1: Start RabbitMQ (Central Service)

```bash
# Navigate to central services
cd central-services

# Start RabbitMQ using the convenience script
./start.sh

# Or manually with docker-compose
docker-compose up -d
```

**Access RabbitMQ Management UI:**

- URL: http://localhost:15672
- Username: `admin`
- Password: `admin123`

### Step 2: Install Dependencies

```bash
# Install amqplib in both services
cd orders-service
pnpm add amqplib
pnpm add -D @types/amqplib

cd ../product-service
pnpm add amqplib
pnpm add -D @types/amqplib
```

### Step 3: Uncomment RabbitMQ Code

In both services, uncomment the RabbitMQ implementation code in:

- `src/infrastructure/messaging/RabbitMQService.ts`

Look for `// TODO: Uncomment when amqplib is installed and RabbitMQ is running` sections.

### Step 4: Start the Microservices

```bash
# Terminal 1 - Product Service (port 3000)
cd product-service
pnpm dev

# Terminal 2 - Orders Service (port 3001)
cd orders-service
pnpm dev
```

### Step 5: Test the System

```bash
# Create a product first
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "A test product",
    "price": 99.99,
    "currency": "USD",
    "stock": 10
  }'

# Create an order (should succeed)
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "items": [
      {
        "productId": "the-product-id-from-above",
        "quantity": 2
      }
    ]
  }'

# Create an order with excessive quantity (should fail and compensate)
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "items": [
      {
        "productId": "the-product-id-from-above",
        "quantity": 100
      }
    ]
  }'
```

## 📊 Monitoring

### RabbitMQ Management UI

1. Open http://localhost:15672
2. Navigate to **Queues** to see message flow
3. Check **Exchanges** to verify bindings
4. Monitor **Connections** from both services

### Console Logs

Both services provide detailed logging:

- 🔍 Saga steps
- 📨 Event publishing
- 📥 Event consumption
- 🔄 Compensation triggers
- ✅ Success/failure outcomes

### CLI Monitoring

```bash
# View RabbitMQ logs
cd central-services
docker-compose logs -f rabbitmq

# Check queue depths
docker exec microservices-rabbitmq rabbitmqctl list_queues name messages

# List connections
docker exec microservices-rabbitmq rabbitmqctl list_connections

# Check service health
docker exec microservices-rabbitmq rabbitmq-diagnostics ping
```

## 🏗️ Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Orders Service │         │     RabbitMQ     │         │ Product Service │
│   (Port 3001)   │◄────────┤  (Port 5672)     ├────────►│   (Port 3000)   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │                             │
        │    OrderCreated           │                             │
        ├───────────────────────────►│                             │
        │                            │    order.created            │
        │                            ├────────────────────────────►│
        │                            │                             │
        │                            │◄────────────────────────────┤
        │                            │  inventory.reserved         │
        │◄───────────────────────────┤  inventory.reservation.failed
        │    (feedback queue)        │                             │
        │                            │                             │
        │   OrderConfirmed/          │                             │
        │   OrderCancelled           │                             │
        └────────────────────────────►                             │
```

## 📁 Project Structure

```
MicroServices/
├── central-services/          # Shared infrastructure
│   ├── docker-compose.yml     # RabbitMQ container config
│   ├── rabbitmq.conf          # RabbitMQ server config
│   ├── definitions.json       # Pre-configured resources
│   ├── start.sh               # Convenience startup script
│   └── README.md              # Detailed documentation
│
├── orders-service/            # Order management microservice
│   ├── src/
│   │   ├── application/
│   │   │   ├── sagas/
│   │   │   │   └── CreateOrderSaga.ts       # Saga orchestrator
│   │   │   └── commands/
│   │   │       ├── CheckInventoryCommand.ts
│   │   │       └── CancelOrderCommand.ts    # Compensation command
│   │   ├── domain/
│   │   │   └── events/
│   │   │       ├── OrderCreatedEvent.ts
│   │   │       ├── OrderConfirmedEvent.ts
│   │   │       ├── OrderCancelledEvent.ts
│   │   │       └── OrderCompensationRequestedEvent.ts
│   │   └── infrastructure/
│   │       ├── config/
│   │       │   └── rabbitmq.config.ts       # RabbitMQ settings
│   │       └── messaging/
│   │           ├── RabbitMQService.ts       # Message queue client
│   │           ├── RabbitMQEventPublisher.ts
│   │           └── OrderEventsConsumer.ts   # Event consumer
│   └── .env                   # Updated with RabbitMQ credentials
│
├── product-service/           # Product management microservice
│   ├── src/
│   │   ├── application/
│   │   │   ├── sagas/
│   │   │   │   └── ProductReservationSaga.ts  # Inventory handler
│   │   │   └── commands/
│   │   │       ├── ReserveProductCommand.ts
│   │   │       └── ReleaseInventoryCommand.ts # Compensation command
│   │   ├── domain/
│   │   │   └── events/
│   │   │       ├── ProductCreatedEvent.ts
│   │   │       ├── InventoryReservedEvent.ts       # Success feedback
│   │   │       ├── InventoryReservationFailedEvent.ts # Failure feedback
│   │   │       └── InventoryReleasedEvent.ts       # Compensation feedback
│   │   └── infrastructure/
│   │       ├── config/
│   │       │   └── rabbitmq.config.ts
│   │       └── messaging/
│   │           ├── RabbitMQService.ts
│   │           ├── RabbitMQEventPublisher.ts
│   │           └── ProductEventsConsumer.ts  # Event consumer
│   └── .env                   # Updated with RabbitMQ credentials
│
└── Documentation/
    ├── REVERSE_SAGA_PATTERN.md     # Pattern explanation
    ├── SAGA_FLOW_DIAGRAM.md        # Visual diagrams
    ├── IMPLEMENTATION_GUIDE.md     # Detailed implementation
    └── REVERSE_SAGA_SUMMARY.md     # Quick reference
```

## 🔄 Event Flow

### Success Path

1. **Order Service**: Creates order (PENDING)
2. **Order Service**: Publishes `OrderCreated` → `orders.exchange`
3. **Product Service**: Consumes event from `order.events` queue
4. **Product Service**: Reserves inventory
5. **Product Service**: Publishes `InventoryReserved` → `order-feedback.exchange`
6. **Order Service**: Consumes from `order-feedback` queue
7. **Order Service**: Confirms order, publishes `OrderConfirmed`

### Failure Path (Compensation)

1. **Order Service**: Creates order (PENDING)
2. **Order Service**: Publishes `OrderCreated`
3. **Product Service**: Attempts to reserve inventory
4. **Product Service**: Fails (insufficient stock)
5. **Product Service**: Publishes `InventoryReservationFailed` → `order-feedback.exchange`
6. **Order Service**: Receives failure event
7. **Order Service**: Triggers compensation
8. **Order Service**: Publishes `OrderCompensationRequested`
9. **Product Service**: Releases any reserved inventory
10. **Order Service**: Cancels order, publishes `OrderCancelled`

## 🛠️ Configuration

### RabbitMQ Connection

Both services use these environment variables (already configured in `.env`):

```bash
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
RABBITMQ_ORDERS_EXCHANGE=orders.exchange
RABBITMQ_PRODUCTS_EXCHANGE=products.exchange
RABBITMQ_FEEDBACK_EXCHANGE=order-feedback.exchange
RABBITMQ_ORDER_FEEDBACK_QUEUE=order-feedback
```

### Pre-configured Resources

RabbitMQ starts with these resources already configured:

**Exchanges:**

- `orders.exchange` (topic)
- `products.exchange` (topic)
- `order-feedback.exchange` (topic)

**Queues:**

- `order-feedback` - Central feedback channel
- `orders.created`, `orders.confirmed`, `orders.cancelled`
- `products.created`, `products.updated`
- `order.events`, `product.events`

**Bindings:**

- All order events → `order.events`
- All product events → `product.events`
- Inventory events → `order-feedback`
- Compensation events → `order-feedback`

## 🧪 Testing Scenarios

### 1. Normal Order Flow

```bash
# Create product with stock
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Widget", "price": 50, "currency": "USD", "stock": 10}'

# Place order within stock limits
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId": "c1", "items": [{"productId": "prod-id", "quantity": 3}]}'

# Expected: Order CONFIRMED, inventory reduced by 3
```

### 2. Insufficient Stock (Compensation)

```bash
# Place order exceeding stock
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId": "c1", "items": [{"productId": "prod-id", "quantity": 50}]}'

# Expected: Order CANCELLED, inventory unchanged, compensation logged
```

### 3. Multiple Products (Partial Failure)

```bash
# Create two products
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Product A", "price": 10, "currency": "USD", "stock": 5}'

curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Product B", "price": 20, "currency": "USD", "stock": 2}'

# Order with mixed availability
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "c1",
    "items": [
      {"productId": "prod-a-id", "quantity": 2},
      {"productId": "prod-b-id", "quantity": 5}
    ]
  }'

# Expected: Compensation triggered, Product A reservation released, order cancelled
```

## 🐛 Troubleshooting

### RabbitMQ not starting

```bash
# Check Docker status
docker ps

# View logs
cd central-services
docker-compose logs rabbitmq

# Restart
docker-compose restart rabbitmq
```

### Services can't connect to RabbitMQ

1. Verify RabbitMQ is running: `docker ps | grep rabbitmq`
2. Check credentials in `.env` files match `docker-compose.yml`
3. Ensure port 5672 is not blocked by firewall
4. Test connection: `telnet localhost 5672`

### Messages not being consumed

1. Check consumers in RabbitMQ UI: http://localhost:15672
2. Verify queue bindings match routing keys
3. Check service logs for connection errors
4. Verify exchange and queue names in configs

### Compensation not triggered

1. Check `order-feedback` queue in RabbitMQ UI
2. Verify feedback events are being published
3. Check OrderEventsConsumer is subscribed correctly
4. Review console logs for saga state tracking

## 🔒 Security Notes

**Current Configuration (Development):**

- Username: `admin`
- Password: `admin123`
- Default vhost: `/`

**For Production:**

1. Change credentials in `docker-compose.yml`
2. Use environment variables for sensitive data
3. Enable TLS/SSL
4. Implement proper user permissions
5. Use separate vhosts per environment
6. Enable authentication plugins

## 📈 Next Steps

1. ✅ RabbitMQ infrastructure setup
2. ✅ Reverse saga pattern implemented
3. ✅ Feedback channel configured
4. ⏳ Test end-to-end flows
5. ⏳ Add payment service integration
6. ⏳ Implement saga state persistence
7. ⏳ Add monitoring and alerting
8. ⏳ Production deployment configuration

## 📚 Additional Resources

- [central-services/README.md](./central-services/README.md) - Detailed RabbitMQ setup
- [REVERSE_SAGA_PATTERN.md](./REVERSE_SAGA_PATTERN.md) - Pattern documentation
- [SAGA_FLOW_DIAGRAM.md](./SAGA_FLOW_DIAGRAM.md) - Visual diagrams
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Code examples

## 🆘 Support

For issues or questions:

1. Check RabbitMQ Management UI for queue/exchange status
2. Review service console logs for errors
3. Verify message routing in RabbitMQ UI
4. Check documentation files for detailed guides

---

**Status**: 🚀 Ready to Run | ✅ Fully Configured | 📖 Documented

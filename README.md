# Microservices Architecture - Learning POC

> A proof-of-concept implementation of microservices architecture demonstrating the **Saga Pattern** with **Compensating Transactions** for distributed transaction management.

## 🎯 Learning Objectives

This project demonstrates:

- **Microservices Architecture**: Independent, loosely-coupled services
- **Event-Driven Communication**: Asynchronous messaging via RabbitMQ
- **Saga Pattern**: Distributed transaction coordination
- **Compensating Transactions**: Automatic rollback on failures
- **Domain-Driven Design**: Clean architecture with clear boundaries
- **TypeScript**: Type-safe implementation
- **Docker**: Containerized infrastructure

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Applications                          │
└────────────────┬───────────────────────────┬─────────────────────────┘
                 │                           │
                 ▼                           ▼
        ┌─────────────────┐         ┌─────────────────┐
        │ Orders Service  │         │ Product Service │
        │   Port: 3001    │         │   Port: 3000    │
        └────────┬────────┘         └────────┬────────┘
                 │                           │
                 │    ┌─────────────────┐   │
                 └────►   RabbitMQ      ◄───┘
                      │   Port: 5672    │
                      │   UI: 15672     │
                      └─────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │ Orders DB    │    │ Products DB  │
            │  (SQLite)    │    │  (SQLite)    │
            └──────────────┘    └──────────────┘
```

### Service Responsibilities

#### **Orders Service** (Saga Orchestrator)

- Creates and manages orders
- Orchestrates distributed transactions
- Tracks saga execution state
- Handles compensation on failures
- Publishes order events

**Key Components:**

- `CreateOrderSaga` - Orchestrates order creation flow
- `OrderEventsConsumer` - Listens to feedback events
- `RabbitMQEventPublisher` - Publishes order events

#### **Product Service** (Saga Participant)

- Manages product catalog
- Handles inventory reservations
- Publishes success/failure feedback events
- Executes compensation (release inventory)

**Key Components:**

- `ProductReservationSaga` - Handles inventory operations
- `ProductEventsConsumer` - Listens to order events
- `RabbitMQEventPublisher` - Publishes inventory feedback

#### **RabbitMQ** (Message Broker)

- Facilitates async communication
- Routes events between services
- Provides feedback channel
- Ensures message delivery

**Pre-configured Resources:**

- 3 Exchanges (orders, products, feedback)
- 9 Queues (including central feedback queue)
- 11 Bindings (automatic routing)

## 🔄 Saga Pattern Implementation

### Forward Flow (Success)

```
┌──────────────┐
│ Create Order │
│  (PENDING)   │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ Publish             │
│ OrderCreated Event  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Product Service     │
│ Reserves Inventory  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Publish             │
│ InventoryReserved   │
│ (feedback queue)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Order Service       │
│ Confirms Order      │
└──────┬──────────────┘
       │
       ▼
┌──────────────┐
│ Order Status │
│  CONFIRMED   │
└──────────────┘
```

### Reverse Flow (Compensation)

```
┌──────────────┐
│ Create Order │
│  (PENDING)   │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ Publish             │
│ OrderCreated Event  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Product Service     │
│ Try Reserve         │
│ ❌ FAILS            │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────┐
│ Publish                 │
│ InventoryReservation    │
│ Failed (feedback queue) │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────┐
│ Order Service       │
│ Triggers            │
│ COMPENSATION        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Execute Rollback    │
│ (Reverse Order)     │
└──────┬──────────────┘
       │
       ▼
┌──────────────┐
│ Order Status │
│  CANCELLED   │
└──────────────┘
```

## 📡 Event Flow & Message Routing

### Exchanges

| Exchange                  | Type  | Purpose                  |
| ------------------------- | ----- | ------------------------ |
| `orders.exchange`         | topic | Order lifecycle events   |
| `products.exchange`       | topic | Product lifecycle events |
| `order-feedback.exchange` | topic | Saga feedback channel    |

### Queues

| Queue              | Consumer        | Purpose                   |
| ------------------ | --------------- | ------------------------- |
| `order-feedback`   | Orders Service  | Central feedback for saga |
| `order.events`     | Product Service | All order events          |
| `product.events`   | Orders Service  | All product events        |
| `orders.created`   | -               | Order created events      |
| `orders.confirmed` | -               | Order confirmed events    |
| `orders.cancelled` | -               | Order cancelled events    |

### Routing Keys

| Routing Key                    | Exchange                | Target Queue     |
| ------------------------------ | ----------------------- | ---------------- |
| `order.created`                | orders.exchange         | order.events     |
| `order.confirmed`              | orders.exchange         | orders.confirmed |
| `order.cancelled`              | orders.exchange         | orders.cancelled |
| `order.compensation.requested` | orders.exchange         | order-feedback   |
| `inventory.reserved`           | order-feedback.exchange | order-feedback   |
| `inventory.reservation.failed` | order-feedback.exchange | order-feedback   |
| `inventory.released`           | order-feedback.exchange | order-feedback   |

## 🚀 Getting Started

### Prerequisites

```bash
# Check installations
docker --version
docker-compose --version
node --version  # v18+
pnpm --version
```

### 1. Start RabbitMQ

```bash
cd central-services
./start.sh

# Or manually
docker-compose up -d

# Verify
docker ps | grep rabbitmq
```

**Access Management UI**: http://localhost:15672 (admin/admin123)

### 2. Install Dependencies

```bash
# Product Service
cd product-service
pnpm install
pnpm add amqplib @types/amqplib

# Orders Service
cd ../orders-service
pnpm install
pnpm add amqplib @types/amqplib
```

### 3. Setup Databases

```bash
# Product Service
cd product-service
pnpm prisma:migrate

# Orders Service
cd ../orders-service
pnpm prisma:migrate
```

### 4. Uncomment RabbitMQ Code

In both services, edit `src/infrastructure/messaging/RabbitMQService.ts`:

- Uncomment sections marked with `// TODO: Uncomment when amqplib is installed`

### 5. Start Services

```bash
# Terminal 1 - Product Service
cd product-service
pnpm dev

# Terminal 2 - Orders Service
cd orders-service
pnpm dev
```

### 6. Run Test Cases

```bash
# Run all saga test scenarios
cd orders-service
pnpm test:saga

# Or run individually
pnpm test:saga:product-success
pnpm test:saga:order-success
pnpm test:saga:order-product-fail
pnpm test:saga:order-inventory-fail
```

## 🧪 Test Scenarios

### Test 1: Product Creation Success

**Scenario**: Create a new product with inventory

```bash
pnpm test:saga:product-success
```

**Expected**:

- ✅ Product created successfully
- ✅ Stock available for orders
- ✅ Product visible in API

### Test 2: Order Success - Full Flow

**Scenario**: Create order with sufficient inventory

```bash
pnpm test:saga:order-success
```

**Expected Flow**:

1. Order created (PENDING)
2. OrderCreated event published
3. Inventory reserved successfully
4. InventoryReserved feedback received
5. Order confirmed (CONFIRMED)
6. Stock reduced

### Test 3: Order Fails - Product API Error

**Scenario**: Create order with invalid product ID

```bash
pnpm test:saga:order-product-fail
```

**Expected Flow**:

1. Order creation attempted
2. Product not found
3. Order creation fails immediately
4. No saga execution
5. Error returned to client

### Test 4: Order Fails - Compensation Saga

**Scenario**: Create order with insufficient inventory

```bash
pnpm test:saga:order-inventory-fail
```

**Expected Flow (Compensation)**:

1. Order created (PENDING)
2. OrderCreated event published
3. Inventory reservation attempted
4. Reservation fails (insufficient stock)
5. InventoryReservationFailed feedback sent
6. **Compensation triggered**
7. Any reserved items released (if multiple products)
8. Order cancelled (CANCELLED)
9. Stock restored

## 📊 Monitoring & Observability

### Console Logs

Both services provide detailed, structured logging:

```
🔍 SAGA Step 1: Fetching product details...
✅ SAGA Step 2: Validating products and building order items...
📝 SAGA Step 3: Creating order with PENDING status...
📢 SAGA Step 4: Publishing OrderCreated event...
🔄 SAGA Step 5: Initiating inventory check...
📨 Received feedback event: inventory.reserved
✅ Inventory reserved for order order-123
📤 Published OrderConfirmed event
```

### RabbitMQ Management UI

Monitor in real-time:

1. **Queues**: Message counts, rates
2. **Exchanges**: Bindings, publish rates
3. **Connections**: Active consumers
4. **Channels**: Message flow

### CLI Monitoring

```bash
# Queue depths
docker exec microservices-rabbitmq rabbitmqctl list_queues name messages

# Active connections
docker exec microservices-rabbitmq rabbitmqctl list_connections

# Consumer status
docker exec microservices-rabbitmq rabbitmqctl list_consumers
```

## 📁 Project Structure

```
MicroServices/
├── central-services/              # Shared infrastructure
│   ├── docker-compose.yml         # RabbitMQ container
│   ├── definitions.json           # Pre-configured resources
│   ├── rabbitmq.conf              # Server configuration
│   └── start.sh                   # Startup script
│
├── orders-service/                # Order management service
│   ├── src/
│   │   ├── application/           # Use cases & sagas
│   │   │   ├── sagas/
│   │   │   │   └── CreateOrderSaga.ts    # Saga orchestrator
│   │   │   └── commands/
│   │   ├── domain/                # Business logic
│   │   │   ├── entities/
│   │   │   ├── events/
│   │   │   └── value-objects/
│   │   ├── infrastructure/        # External concerns
│   │   │   ├── messaging/         # RabbitMQ integration
│   │   │   └── persistence/       # Database access
│   │   └── presentation/          # HTTP API
│   ├── tests/
│   │   └── saga/                  # Saga test scenarios
│   └── package.json
│
├── product-service/               # Product management service
│   ├── src/
│   │   ├── application/
│   │   │   └── sagas/
│   │   │       └── ProductReservationSaga.ts  # Inventory handler
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   └── presentation/
│   └── package.json
│
└── Documentation/
    ├── README.md                  # This file
    ├── QUICKSTART.md              # Setup guide
    ├── REVERSE_SAGA_PATTERN.md    # Pattern details
    ├── SAGA_FLOW_DIAGRAM.md       # Visual diagrams
    └── IMPLEMENTATION_GUIDE.md    # Code examples
```

## 🔧 Configuration

### Environment Variables

**Orders Service** (`.env`):

```bash
DATABASE_URL="file:./data/dev.db"
RABBITMQ_URL="amqp://admin:admin123@localhost:5672"
RABBITMQ_ORDERS_EXCHANGE="orders.exchange"
RABBITMQ_PRODUCTS_EXCHANGE="products.exchange"
RABBITMQ_FEEDBACK_EXCHANGE="order-feedback.exchange"
RABBITMQ_ORDER_FEEDBACK_QUEUE="order-feedback"
PRODUCT_SERVICE_URL="http://localhost:3000"
```

**Product Service** (`.env`):

```bash
DATABASE_URL="file:./data/dev.db"
RABBITMQ_URL="amqp://admin:admin123@localhost:5672"
RABBITMQ_PRODUCTS_EXCHANGE="products.exchange"
RABBITMQ_ORDERS_EXCHANGE="orders.exchange"
RABBITMQ_FEEDBACK_EXCHANGE="order-feedback.exchange"
RABBITMQ_ORDER_FEEDBACK_QUEUE="order-feedback"
```

## 🎓 Key Concepts Demonstrated

### 1. Saga Pattern

Coordinates distributed transactions across multiple services without distributed locks or two-phase commits.

### 2. Compensating Transactions

Automatically rolls back completed steps when a later step fails, maintaining data consistency.

### 3. Event-Driven Architecture

Services communicate via events rather than direct API calls, reducing coupling.

### 4. Feedback Channel

Centralized queue where participants send success/failure events back to the orchestrator.

### 5. Idempotency

Operations can be safely retried without side effects (e.g., releasing already-released inventory).

### 6. Clean Architecture

Clear separation of concerns: Domain, Application, Infrastructure, Presentation layers.

## 🐛 Troubleshooting

### RabbitMQ Connection Issues

```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# View logs
cd central-services
docker-compose logs -f rabbitmq

# Restart
docker-compose restart rabbitmq
```

### Services Not Connecting

1. Verify RabbitMQ credentials in `.env`
2. Check firewall/port access
3. Ensure RabbitMQ fully started (wait 30s)
4. Check service logs for errors

### Messages Not Consumed

1. Verify consumers in RabbitMQ UI
2. Check queue bindings
3. Verify routing keys match
4. Review service console logs

### Saga Not Compensating

1. Check `order-feedback` queue
2. Verify feedback events published
3. Review saga state tracking logs
4. Check OrderEventsConsumer subscriptions

## 📚 Learning Resources

### Documentation Files

- **REVERSE_SAGA_PATTERN.md** - Deep dive into saga pattern
- **SAGA_FLOW_DIAGRAM.md** - Visual flow diagrams
- **IMPLEMENTATION_GUIDE.md** - Detailed code examples
- **QUICKSTART.md** - Setup instructions

### External Resources

- [Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)

## 🚧 Future Enhancements

- [ ] Payment service integration
- [ ] Saga state persistence (database)
- [ ] Timeout handling with retry logic
- [ ] Dead letter queue (DLQ) setup
- [ ] Circuit breaker pattern
- [ ] Distributed tracing (OpenTelemetry)
- [ ] API Gateway (single entry point)
- [ ] Authentication & Authorization
- [ ] Rate limiting
- [ ] Caching layer (Redis)
- [ ] Monitoring dashboard (Grafana)
- [ ] Load testing scenarios
- [ ] Kubernetes deployment manifests

## 📝 API Endpoints

### Product Service (Port 3000)

```bash
# Create product
POST /api/products
{
  "name": "Widget",
  "description": "A useful widget",
  "price": 29.99,
  "currency": "USD",
  "stock": 100
}

# Get all products
GET /api/products

# Get product by ID
GET /api/products/:id
```

### Orders Service (Port 3001)

```bash
# Create order
POST /api/orders
{
  "customerId": "customer-123",
  "items": [
    {
      "productId": "prod-id",
      "quantity": 2
    }
  ]
}

# Get order by ID
GET /api/orders/:id

# Get orders by customer
GET /api/orders/customer/:customerId
```

## 🎯 Success Criteria

This POC successfully demonstrates:

- ✅ Independent microservices communicating via events
- ✅ Saga pattern orchestrating distributed transactions
- ✅ Automatic compensation on failures
- ✅ Asynchronous, non-blocking communication
- ✅ Type-safe TypeScript implementation
- ✅ Clean architecture with domain-driven design
- ✅ Comprehensive test scenarios
- ✅ Production-ready RabbitMQ setup
- ✅ Detailed logging and observability
- ✅ Complete documentation

## 🤝 Contributing

This is a learning project. Feel free to:

- Experiment with the code
- Add new services (e.g., payment, shipping)
- Implement additional saga patterns
- Enhance error handling
- Add more test scenarios
- Improve documentation

## 📄 License

This is a learning POC - use freely for educational purposes.

---

**Project Status**: ✅ POC Complete | 🎓 Educational | 🚀 Ready to Explore

Built with ❤️ to learn microservices architecture and distributed transactions.

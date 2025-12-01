# Orders Service

A microservice for managing orders in a distributed system using **SAGA pattern** for distributed transactions.

## Architecture

This service follows Clean Architecture principles with:
- **Domain Layer**: Core business logic, entities, value objects
- **Application Layer**: Use cases, DTOs, commands, sagas
- **Infrastructure Layer**: External concerns (database, messaging)
- **Presentation Layer**: HTTP controllers, routes, validation

## Tech Stack

- TypeScript
- Express
- Prisma (SQLite)
- Zod for validation
- SAGA Pattern for distributed transactions

## Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client and setup database
pnpm run db:setup

# Run development server (port 3001)
pnpm dev
```

## SAGA Pattern Implementation

The `CreateOrderSaga` orchestrates the distributed transaction:

1. **Fetch Product Details** - Calls Product Service API to get product info and pricing
2. **Create Order** - Creates order with `PENDING` status
3. **Publish OrderCreated Event** - Notifies other services
4. **Inventory Check** - Asynchronously checks inventory (simulated for now)
5. **Confirm/Cancel** - Updates order status based on inventory availability

### Flow Diagram
```
Client Request
    ↓
CreateOrderController
    ↓
CreateOrderUseCase
    ↓
CreateOrderSaga
    ├─→ Fetch Products (Product Service API)
    ├─→ Create Order (PENDING status)
    ├─→ Publish OrderCreated Event
    └─→ Async Inventory Check
        ├─→ SUCCESS: Confirm Order → Publish OrderConfirmed
        └─→ FAILURE: Cancel Order → Publish OrderCancelled
```

## API Endpoints

### Create Order
```bash
POST /api/orders
Content-Type: application/json

{
  "customerId": "customer-123",
  "items": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 2
    }
  ]
}
```

Response: Order created with `PENDING` status. The SAGA will asynchronously process inventory check.

### Get Order by ID
```bash
GET /api/orders/:id
```

### Get Orders by Customer
```bash
GET /api/orders?customerId=customer-123
```

## Testing the SAGA Pattern

1. **Start Product Service** (port 3000):
```bash
cd ../product-service
pnpm dev
```

2. **Create a Product**:
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "A test product",
    "price": 99.99,
    "stock": 100
  }'
```

3. **Start Orders Service** (port 3001):
```bash
cd ../orders-service
pnpm dev
```

4. **Create an Order** (use the product ID from step 2):
```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "items": [
      {
        "productId": "<product-id-from-step-2>",
        "quantity": 2
      }
    ]
  }'
```

5. **Check Order Status** (after 2 seconds):
```bash
curl http://localhost:3001/api/orders/<order-id>
```

The order status will change from `PENDING` to either `CONFIRMED` or `CANCELLED` based on simulated inventory check.

## Domain Model

### Order Entity
- Order ID (unique identifier)
- Customer ID
- Order Items (product details, quantity, price)
- Order Status (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, FAILED)
- Total amount
- Timestamps

### Value Objects
- `OrderId`: Immutable order identifier
- `OrderItem`: Individual item in an order
- `OrderStatus`: Order lifecycle state with transition rules
- `Money`: Monetary value with currency

### Domain Events
- `OrderCreatedEvent` - Order created with PENDING status
- `OrderConfirmedEvent` - Inventory confirmed, order approved
- `OrderCancelledEvent` - Insufficient inventory, order cancelled
- `OrderFailedEvent` - Error in processing, order failed

## Environment Variables

```env
DATABASE_URL="file:./data/dev.db"
PORT=3001
PRODUCT_SERVICE_URL="http://localhost:3000"
```

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm type-check` - Type check
- `pnpm lint` - Lint code
- `pnpm format` - Format code
- `pnpm prisma:migrate` - Run migrations
- `pnpm prisma:studio` - Open Prisma Studio

## Future Enhancements

- [ ] Integrate with real Inventory Service
- [ ] Implement message broker (RabbitMQ/Kafka) for event-driven communication
- [ ] Add compensation logic for failed sagas
- [ ] Implement order cancellation saga
- [ ] Add payment processing saga
- [ ] Implement saga state persistence for recovery

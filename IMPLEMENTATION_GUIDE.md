# Reverse Saga Implementation Guide

## Quick Start

### 1. Enable RabbitMQ (Required)

```bash
# Start RabbitMQ using Docker
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management

# Access RabbitMQ Management UI
# http://localhost:15672
# Username: guest
# Password: guest
```

### 2. Install amqplib

```bash
# In both services
pnpm add amqplib
pnpm add -D @types/amqplib
```

### 3. Uncomment RabbitMQ Code

In both services, uncomment the TODO sections in:

- `src/infrastructure/messaging/RabbitMQService.ts`

### 4. Configure Environment

```bash
# orders-service/.env
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_ORDERS_EXCHANGE=orders.exchange
RABBITMQ_PRODUCTS_EXCHANGE=products.exchange
RABBITMQ_FEEDBACK_EXCHANGE=order-feedback.exchange
RABBITMQ_ORDER_FEEDBACK_QUEUE=order-feedback
PRODUCT_SERVICE_URL=http://localhost:3000

# product-service/.env
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_PRODUCTS_EXCHANGE=products.exchange
RABBITMQ_ORDERS_EXCHANGE=orders.exchange
RABBITMQ_FEEDBACK_EXCHANGE=order-feedback.exchange
RABBITMQ_ORDER_FEEDBACK_QUEUE=order-feedback
```

## API Usage Examples

### Creating an Order (Success Case)

```bash
# Request
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "items": [
      {
        "productId": "prod-1",
        "quantity": 2
      },
      {
        "productId": "prod-2",
        "quantity": 1
      }
    ]
  }'

# Response
{
  "success": true,
  "data": {
    "id": "order-456",
    "customerId": "customer-123",
    "status": "PENDING",
    "items": [...],
    "total": 299.99,
    "createdAt": "2025-11-30T10:00:00Z"
  }
}

# Console Logs (Order Service):
# 🔍 SAGA Step 1: Fetching product details...
# ✅ SAGA Step 2: Validating products and building order items...
# 📝 SAGA Step 3: Creating order with PENDING status...
# 📢 SAGA Step 4: Publishing OrderCreated event...
# 🔄 SAGA Step 5: Initiating inventory check...

# Console Logs (Product Service):
# 📨 Received order event: order.created
# 🔒 Reserving inventory for order order-456...
# ✅ Inventory reserved: RES-order-456-prod-1-1234567890
# 📤 Published inventory.reserved event to feedback queue

# Console Logs (Order Service - Feedback):
# 📨 Received feedback event: inventory.reserved
# ✅ Inventory reserved for order order-456: 2x prod-1
# ✅ Order confirmed
```

### Creating an Order (Failure Case)

```bash
# Request (quantity exceeds stock)
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "items": [
      {
        "productId": "prod-1",
        "quantity": 100
      }
    ]
  }'

# Response
{
  "success": false,
  "error": "Order cancelled: Insufficient inventory"
}

# Console Logs (Product Service):
# 📨 Received order event: order.created
# 🔒 Reserving inventory for order order-789...
# ❌ Cannot fulfill order - insufficient stock
# 📤 Published inventory.reservation.failed event

# Console Logs (Order Service - Compensation):
# 📨 Received feedback event: inventory.reservation.failed
# ❌ Inventory reservation failed for order order-789
# 🔙 Starting compensation for order order-789
# 🚫 Cancelling order
# ✅ Compensation completed
```

## Code Examples

### Manually Triggering Compensation

```typescript
// In order service application layer
import { createOrderSaga } from "@application/instances.js";
import { CancelOrderCommand } from "@application/commands/CancelOrderCommand.js";

// Cancel an order programmatically
const cancelCommand: CancelOrderCommand = {
  orderId: "order-123",
  reason: "Customer requested cancellation",
  initiatedBy: "admin",
};

await createOrderSaga.executeCancelOrder(cancelCommand);
```

### Handling Custom Feedback Events

```typescript
// In OrderEventsConsumer.ts
private async handleFeedbackEvent(message: unknown): Promise<void> {
  const event = message as { eventType: string; payload: unknown };

  switch (event.eventType) {
    case 'inventory.reserved':
      await this.handleInventoryReserved(event.payload);
      break;

    case 'inventory.reservation.failed':
      await this.handleInventoryReservationFailed(event.payload);
      break;

    case 'payment.success':
      await this.handlePaymentSuccess(event.payload);
      break;

    case 'payment.failed':
      await this.handlePaymentFailed(event.payload);
      break;

    // Add more feedback handlers as needed
  }
}
```

### Adding a New Participant Service

```typescript
// Example: Payment Service Integration

// 1. Create payment events
export class PaymentSuccessEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly amount: number,
    public readonly transactionId: string
  ) {
    super('payment.success', orderId);
  }

  toPayload(): Record<string, unknown> {
    return {
      eventType: this.eventType,
      eventId: this.eventId,
      occurredOn: this.occurredOn,
      orderId: this.orderId,
      amount: this.amount,
      transactionId: this.transactionId,
    };
  }
}

export class PaymentFailedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly reason: string
  ) {
    super('payment.failed', orderId);
  }

  toPayload(): Record<string, unknown> {
    return {
      eventType: this.eventType,
      eventId: this.eventId,
      occurredOn: this.occurredOn,
      orderId: this.orderId,
      reason: this.reason,
    };
  }
}

// 2. Create compensation event
export class PaymentRefundedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly transactionId: string,
    public readonly reason: string
  ) {
    super('payment.refunded', orderId);
  }

  toPayload(): Record<string, unknown> {
    return {
      eventType: this.eventType,
      eventId: this.eventId,
      occurredOn: this.occurredOn,
      orderId: this.orderId,
      transactionId: this.transactionId,
      reason: this.reason,
    };
  }
}

// 3. Update saga to track payment step
private async processPayment(orderId: string, amount: number): Promise<void> {
  // Call payment service
  const result = await paymentService.charge(amount);

  if (result.success) {
    this.trackStep(orderId, {
      step: 'payment_processed',
      status: 'completed',
      data: { transactionId: result.transactionId },
      timestamp: new Date(),
      compensatable: true,
    });

    // Publish success to feedback queue
    const event = new PaymentSuccessEvent(orderId, amount, result.transactionId);
    await this.eventPublisher.publish(event);
  } else {
    // Publish failure to trigger compensation
    const event = new PaymentFailedEvent(orderId, result.reason);
    await this.eventPublisher.publish(event);
  }
}

// 4. Add compensation logic
private async compensateStep(orderId: string, step: SagaStep): Promise<void> {
  switch (step.step) {
    case 'payment_processed':
      await this.refundPayment(orderId, step.data.transactionId);
      break;

    case 'inventory_reserved':
      await this.releaseInventory(orderId, step.data);
      break;

    // ... other cases
  }
}

private async refundPayment(orderId: string, transactionId: string): Promise<void> {
  await paymentService.refund(transactionId);

  const event = new PaymentRefundedEvent(
    orderId,
    transactionId,
    'Order cancelled'
  );
  await this.eventPublisher.publish(event);
}
```

## Testing

### Unit Tests

```typescript
// CreateOrderSaga.test.ts
import { CreateOrderSaga } from '@application/sagas/CreateOrderSaga';
import { mock } from 'jest-mock-extended';

describe('CreateOrderSaga - Compensation', () => {
  it('should compensate when inventory reservation fails', async () => {
    const mockRepository = mock<IOrderRepository>();
    const mockPublisher = mock<IEventPublisher>();

    const saga = new CreateOrderSaga(mockRepository, mockPublisher);

    // Create order
    const order = await saga.execute('customer-1', [
      { productId: 'prod-1', quantity: 2 },
    ]);

    // Simulate inventory failure
    await saga.handleFeedbackEvent('inventory.reservation.failed', {
      orderId: order.id.toString(),
      productId: 'prod-1',
      reason: 'Insufficient stock',
    });

    // Verify compensation
    expect(mockPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'order.compensation.requested',
      })
    );

    expect(mockRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: expect.objectContaining({ value: 'CANCELLED' }),
      })
    );
  });

  it('should execute compensations in reverse order', async () => {
    const saga = new CreateOrderSaga(mockRepository, mockPublisher);
    const compensations: string[] = [];

    // Mock compensation methods to track order
    jest.spyOn(saga as any, 'releaseInventory').mockImplementation(async () => {
      compensations.push('inventory');
    });

    jest.spyOn(saga as any, 'refundPayment').mockImplementation(async () => {
      compensations.push('payment');
    });

    // Create order and complete steps
    const order = await saga.execute('customer-1', items);

    // Simulate successful inventory reservation
    await saga.handleFeedbackEvent('inventory.reserved', {...});

    // Simulate successful payment
    await saga.handleFeedbackEvent('payment.success', {...});

    // Trigger compensation
    await saga.compensate(order.id.toString(), 'Test failure');

    // Verify reverse order
    expect(compensations).toEqual(['payment', 'inventory']);
  });
});
```

### Integration Tests

```typescript
// OrderSaga.integration.test.ts
describe("Order Saga Integration", () => {
  it("should handle full saga flow with RabbitMQ", async () => {
    // Start services
    await orderService.start();
    await productService.start();

    // Create order
    const response = await request(orderService.app)
      .post("/api/orders")
      .send({
        customerId: "customer-1",
        items: [{ productId: "prod-1", quantity: 2 }],
      });

    expect(response.status).toBe(201);

    // Wait for saga completion
    await waitFor(async () => {
      const order = await orderRepository.findById(response.body.data.id);
      return order?.status.toString() === "CONFIRMED";
    });

    // Verify product stock reduced
    const product = await productRepository.findById("prod-1");
    expect(product?.stock).toBe(8); // 10 - 2
  });

  it("should compensate on insufficient stock", async () => {
    // Create order with excessive quantity
    const response = await request(orderService.app)
      .post("/api/orders")
      .send({
        customerId: "customer-1",
        items: [{ productId: "prod-1", quantity: 100 }],
      });

    // Wait for compensation
    await waitFor(async () => {
      const order = await orderRepository.findById(response.body.data.id);
      return order?.status.toString() === "CANCELLED";
    });

    // Verify product stock unchanged
    const product = await productRepository.findById("prod-1");
    expect(product?.stock).toBe(10);
  });
});
```

## Monitoring

### Logging Best Practices

```typescript
// Structured logging for saga tracking
console.log({
  level: "info",
  saga: "CreateOrderSaga",
  action: "step_completed",
  orderId: order.id.toString(),
  step: "inventory_reserved",
  duration: Date.now() - startTime,
  timestamp: new Date().toISOString(),
});

// Error logging
console.error({
  level: "error",
  saga: "CreateOrderSaga",
  action: "compensation_failed",
  orderId: order.id.toString(),
  step: "inventory_release",
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
});
```

### Metrics to Track

1. **Saga Success Rate**: `completed / total * 100`
2. **Compensation Rate**: `compensated / total * 100`
3. **Average Saga Duration**: `sum(durations) / count`
4. **Compensation Reasons**: Breakdown by failure type
5. **Step Failure Rates**: Per-step success/failure ratio

### RabbitMQ Monitoring

```bash
# Check queue depth
rabbitmqctl list_queues name messages

# Check exchange bindings
rabbitmqctl list_bindings

# Monitor message rates
watch -n 1 'rabbitmqctl list_queues name messages_ready messages_unacknowledged'
```

## Troubleshooting

### Issue: Messages Not Being Consumed

**Solution:**

1. Check RabbitMQ is running: `docker ps | grep rabbitmq`
2. Verify queue bindings: Check RabbitMQ Management UI
3. Check consumer logs for connection errors
4. Verify routing keys match in both publisher and consumer

### Issue: Compensation Not Triggered

**Solution:**

1. Verify feedback events are being published
2. Check OrderEventsConsumer is listening to feedback queue
3. Verify saga state is being tracked correctly
4. Check event payload structure matches expected format

### Issue: Duplicate Compensations

**Solution:**

1. Implement idempotency checks using reservation IDs
2. Use message deduplication in RabbitMQ
3. Store compensation state to prevent duplicate execution

### Issue: Saga State Memory Leak

**Solution:**

1. Ensure `clearSagaState()` is called after completion
2. Implement TTL for saga state entries
3. Consider persisting state to database instead of memory

## Production Considerations

### 1. State Persistence

Store saga state in database for recovery:

```typescript
interface SagaExecutionRecord {
  id: string;
  orderId: string;
  status: "in_progress" | "completed" | "compensating" | "failed";
  steps: SagaStep[];
  createdAt: Date;
  updatedAt: Date;
}

// Save state after each step
await sagaRepository.save(sagaExecution);

// Recover on service restart
const pendingSagas = await sagaRepository.findByStatus("in_progress");
for (const saga of pendingSagas) {
  await this.resumeSaga(saga);
}
```

### 2. Timeout Handling

```typescript
const SAGA_TIMEOUT_MS = 30000; // 30 seconds

private async executeWithTimeout(orderId: string): Promise<void> {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Saga timeout')), SAGA_TIMEOUT_MS)
  );

  try {
    await Promise.race([this.execute(orderId), timeoutPromise]);
  } catch (error) {
    if (error.message === 'Saga timeout') {
      await this.compensate(orderId, 'Saga execution timeout');
    }
    throw error;
  }
}
```

### 3. Dead Letter Queue

```typescript
// Configure DLQ in RabbitMQ
await channel.assertQueue("order-feedback.dlq", {
  durable: true,
});

await channel.assertQueue("order-feedback", {
  durable: true,
  deadLetterExchange: "",
  deadLetterRoutingKey: "order-feedback.dlq",
});
```

### 4. Circuit Breaker

```typescript
import CircuitBreaker from "opossum";

const breaker = new CircuitBreaker(productService.reserve, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

breaker.fallback(() => {
  return { success: false, reason: "Service unavailable" };
});
```

## Next Steps

1. ✅ Implement reverse saga pattern
2. ✅ Add feedback channel (order-feedback queue)
3. ✅ Create compensation events
4. ✅ Update saga orchestrator
5. ⏳ Enable RabbitMQ and test end-to-end
6. ⏳ Add payment service integration
7. ⏳ Implement saga state persistence
8. ⏳ Add monitoring and alerting
9. ⏳ Load testing and optimization

## Resources

- [REVERSE_SAGA_PATTERN.md](./REVERSE_SAGA_PATTERN.md) - Detailed pattern documentation
- [SAGA_FLOW_DIAGRAM.md](./SAGA_FLOW_DIAGRAM.md) - Visual flow diagrams
- [RABBITMQ.md](./RABBITMQ.md) - RabbitMQ configuration guide

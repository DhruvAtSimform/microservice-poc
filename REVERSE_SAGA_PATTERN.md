# Reverse Saga Pattern Implementation

## Overview

This implementation provides a comprehensive **Saga Orchestration Pattern** with **Compensating Transactions (Reverse Saga)** for handling distributed transactions across microservices. The pattern ensures data consistency through coordinated rollback when failures occur.

## Architecture

### Components

1. **Order Service (Orchestrator)**

   - Manages the overall saga workflow
   - Tracks saga execution steps
   - Coordinates compensation when failures occur
   - Listens to `order-feedback` queue for downstream responses

2. **Product Service (Participant)**

   - Handles inventory reservation requests
   - Publishes success/failure events to `order-feedback` queue
   - Executes compensation (inventory release) when requested

3. **Feedback Channel**
   - Single queue: `order-feedback`
   - Used by all participant services (inventory, payment, etc.)
   - Provides asynchronous communication for saga coordination

## Message Flow

### Forward Saga (Success Case)

```
1. Order Service → Creates Order (PENDING)
2. Order Service → Publishes OrderCreated event
3. Product Service → Receives OrderCreated event
4. Product Service → Reserves inventory
5. Product Service → Publishes InventoryReserved event to order-feedback
6. Order Service → Receives InventoryReserved from order-feedback
7. Order Service → Confirms Order
8. Order Service → Publishes OrderConfirmed event
```

### Reverse Saga (Failure Case)

```
1. Order Service → Creates Order (PENDING)
2. Order Service → Publishes OrderCreated event
3. Product Service → Receives OrderCreated event
4. Product Service → Fails to reserve inventory (insufficient stock)
5. Product Service → Publishes InventoryReservationFailed event to order-feedback
6. Order Service → Receives InventoryReservationFailed from order-feedback
7. Order Service → Triggers compensation (reverse saga)
8. Order Service → Publishes OrderCompensationRequested event
9. Product Service → Receives compensation request
10. Product Service → Releases any reserved inventory
11. Product Service → Publishes InventoryReleased event to order-feedback
12. Order Service → Cancels Order
13. Order Service → Publishes OrderCancelled event
```

## Domain Events

### Forward Transaction Events

- **OrderCreatedEvent** - Order initiated
- **InventoryReservedEvent** - Inventory successfully reserved
- **OrderConfirmedEvent** - Order confirmed after all reservations

### Failure Events (Trigger Compensation)

- **InventoryReservationFailedEvent** - Inventory reservation failed
- **PaymentFailedEvent** - Payment processing failed (future)
- **OrderFailedEvent** - General order failure

### Compensation Events

- **OrderCompensationRequestedEvent** - Request to rollback changes
- **InventoryReleasedEvent** - Inventory reservation released
- **OrderCancelledEvent** - Order cancelled after compensation

## Configuration

### RabbitMQ Setup

Both services use the following configuration:

```typescript
{
  exchanges: {
    orders: 'orders.exchange',
    products: 'products.exchange',
    feedback: 'order-feedback.exchange'
  },
  queues: {
    orderFeedback: 'order-feedback'
  },
  routingKeys: {
    inventoryReserved: 'inventory.reserved',
    inventoryReservationFailed: 'inventory.reservation.failed',
    inventoryReleased: 'inventory.released',
    orderCompensation: 'order.compensation.requested'
  }
}
```

### Queue Bindings

**Order Service** listens to `order-feedback` with bindings:

- `inventory.reserved`
- `inventory.reservation.failed`
- `inventory.released`
- `payment.success` (future)
- `payment.failed` (future)

**Product Service** listens to `order-feedback` with bindings:

- `order.compensation.requested`

## Saga State Tracking

The `CreateOrderSaga` maintains state for each order:

```typescript
interface SagaStep {
  step: string; // Step identifier
  status: "completed" | "failed"; // Step status
  data: any; // Step-specific data
  timestamp: Date; // Execution time
  compensatable: boolean; // Can be rolled back
}
```

### Tracked Steps

1. **order_created** - Order persisted to database
2. **inventory_reserved** - Inventory successfully reserved
3. **payment_processed** - Payment completed (future)

## Compensation Logic

### Saga Orchestrator (Order Service)

```typescript
async compensate(orderId: string, reason: string): Promise<void> {
  const steps = this.getCompletedSteps(orderId);

  // Execute compensations in reverse order
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];

    if (step.compensatable) {
      await this.compensateStep(orderId, step, reason);
    }
  }

  // Cancel the order
  await this.cancelOrder(orderId, reason);

  // Clean up saga state
  this.clearSagaState(orderId);
}
```

### Participant Services

Each service implements compensating transactions:

```typescript
// Product Service
async compensateReservation(command: ReleaseInventoryCommand): Promise<void> {
  // Restore inventory
  product.updateStock(command.quantity);
  await productRepository.update(product);

  // Publish confirmation
  const releasedEvent = new InventoryReleasedEvent(...);
  await eventPublisher.publish(releasedEvent);
}
```

## Error Handling

### Timeout Handling

Future enhancement: Implement timeout mechanism for saga steps

```typescript
// Pseudo-code
if (stepDuration > TIMEOUT_THRESHOLD) {
  await this.compensate(orderId, "Step timeout exceeded");
}
```

### Idempotency

All compensation operations should be idempotent:

- Releasing already-released inventory should be safe
- Cancelling already-cancelled orders should be safe
- Use reservation IDs to track state

### Retry Logic

Failed compensations should be retried:

- Dead Letter Queue (DLQ) for failed compensations
- Manual intervention for persistent failures

## Usage Examples

### Creating an Order (Forward Saga)

```typescript
const orderSaga = new CreateOrderSaga(
  orderRepository,
  eventPublisher,
  productServiceUrl
);

const order = await orderSaga.execute(customerId, [
  { productId: "prod-1", quantity: 2 },
  { productId: "prod-2", quantity: 1 },
]);
```

### Handling Feedback Events

```typescript
// In OrderEventsConsumer
await orderSaga.handleFeedbackEvent("inventory.reserved", {
  orderId: "order-123",
  productId: "prod-1",
  quantity: 2,
  reservationId: "res-123",
});
```

### Triggering Compensation

```typescript
// Automatic via feedback event
await orderSaga.handleFeedbackEvent("inventory.reservation.failed", {
  orderId: "order-123",
  productId: "prod-1",
  reason: "Insufficient stock",
});

// Manual cancellation
await orderSaga.executeCancelOrder({
  orderId: "order-123",
  reason: "Customer requested cancellation",
  initiatedBy: "admin",
});
```

## Testing Scenarios

### Scenario 1: Successful Order

1. Create order with available products
2. Verify order status: PENDING → CONFIRMED
3. Verify inventory reduced
4. No compensation events published

### Scenario 2: Insufficient Inventory

1. Create order exceeding available stock
2. Verify `InventoryReservationFailed` event published
3. Verify compensation triggered
4. Verify order status: PENDING → CANCELLED
5. Verify inventory unchanged

### Scenario 3: Partial Failure

1. Create order with multiple products
2. First product reservation succeeds
3. Second product reservation fails
4. Verify compensation releases first product
5. Verify order cancelled

## Future Enhancements

### Payment Service Integration

Add payment processing to the saga:

```
1. Reserve Inventory ✓
2. Process Payment (new)
3. Confirm Order

Compensation:
- Refund Payment
- Release Inventory
- Cancel Order
```

### Saga State Persistence

Store saga state in database for recovery:

```typescript
interface SagaExecution {
  id: string;
  orderId: string;
  status: "in-progress" | "completed" | "compensating" | "failed";
  steps: SagaStep[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Monitoring and Observability

- Track saga execution metrics
- Alert on high compensation rates
- Distributed tracing (Jaeger/Zipkin)
- Saga execution dashboard

## Best Practices

1. **Always Track Steps**: Record every compensatable action
2. **Idempotent Operations**: Design compensations to be safely retried
3. **Timeout Handling**: Set reasonable timeouts for async operations
4. **Clear Naming**: Use descriptive event and command names
5. **Dead Letter Queues**: Handle poison messages gracefully
6. **Logging**: Comprehensive logging for debugging
7. **Testing**: Test all failure scenarios thoroughly

## References

- [Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [Compensating Transactions](https://docs.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)

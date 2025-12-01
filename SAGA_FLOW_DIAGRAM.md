# Reverse Saga Flow Diagram

## System Overview

```
┌─────────────────────┐         ┌─────────────────────┐
│   Order Service     │         │  Product Service    │
│   (Orchestrator)    │         │   (Participant)     │
└──────────┬──────────┘         └──────────┬──────────┘
           │                                │
           │        RabbitMQ Exchanges      │
           │   ┌───────────────────────┐   │
           └───┤  orders.exchange      ├───┘
               │  products.exchange    │
               │  order-feedback.exchange │
               └───────────────────────┘
```

## Forward Saga Flow (Happy Path)

```
┌──────────┐                           ┌──────────┐
│  Order   │                           │ Product  │
│ Service  │                           │ Service  │
└────┬─────┘                           └─────┬────┘
     │                                       │
     │ 1. Create Order (PENDING)             │
     ├──────────────────────────────────────►│
     │                                       │
     │ 2. Publish OrderCreated               │
     ├──────────orders.exchange──────────────►
     │                                       │
     │                                  3. Reserve
     │                                  Inventory
     │                                       │
     │◄────order-feedback.exchange───────────┤
     │ 4. InventoryReserved Event            │
     │                                       │
     │ 5. Confirm Order                      │
     │                                       │
     │ 6. Publish OrderConfirmed             │
     ├──────────orders.exchange──────────────►
     │                                       │
     ▼                                       ▼
```

## Reverse Saga Flow (Failure Path)

```
┌──────────┐                           ┌──────────┐
│  Order   │                           │ Product  │
│ Service  │                           │ Service  │
└────┬─────┘                           └─────┬────┘
     │                                       │
     │ 1. Create Order (PENDING)             │
     ├──────────────────────────────────────►│
     │                                       │
     │ 2. Publish OrderCreated               │
     ├──────────orders.exchange──────────────►
     │                                       │
     │                               3. Try Reserve
     │                               ❌ FAILS
     │                               (Insufficient Stock)
     │                                       │
     │◄────order-feedback.exchange───────────┤
     │ 4. InventoryReservationFailed         │
     │                                       │
     │ 5. Trigger Compensation               │
     │    (Reverse Saga)                     │
     │                                       │
     │ 6. OrderCompensationRequested         │
     ├──────────order-feedback.exchange─────►│
     │                                       │
     │                               7. Release Any
     │                               Reserved Inventory
     │                                       │
     │◄────order-feedback.exchange───────────┤
     │ 8. InventoryReleased                  │
     │                                       │
     │ 9. Cancel Order                       │
     │                                       │
     │ 10. Publish OrderCancelled            │
     ├──────────orders.exchange──────────────►
     │                                       │
     ▼                                       ▼
```

## Event Flow Through Feedback Channel

```
order-feedback Queue Bindings:
├── inventory.reserved            → Order Service
├── inventory.reservation.failed  → Order Service
├── inventory.released            → Order Service
├── payment.success               → Order Service (future)
├── payment.failed                → Order Service (future)
└── order.compensation.requested  → Product Service
```

## Saga State Tracking

```
Order Saga State Machine:
┌─────────┐
│ INITIAL │
└────┬────┘
     │
     ▼
┌──────────────┐
│order_created │ (compensatable)
└──────┬───────┘
       │
       ▼
┌────────────────────┐
│inventory_reserved  │ (compensatable)
└──────┬─────────────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
SUCCESS  FAILURE
   │       │
   │       ▼
   │   ┌─────────────┐
   │   │ COMPENSATION│
   │   │   TRIGGERED │
   │   └──────┬──────┘
   │          │
   │     Execute in
   │   Reverse Order
   │          │
   │          ▼
   │   ┌──────────────┐
   │   │ release_inv  │
   │   └──────┬───────┘
   │          │
   │          ▼
   │   ┌──────────────┐
   │   │ cancel_order │
   │   └──────┬───────┘
   │          │
   ▼          ▼
┌────────┐ ┌──────────┐
│CONFIRMED│ │CANCELLED │
└────────┘ └──────────┘
```

## Message Structure Examples

### Success Event

```json
{
  "eventType": "inventory.reserved",
  "eventId": "uuid-123",
  "occurredOn": "2025-11-30T10:00:00Z",
  "orderId": "order-456",
  "productId": "prod-789",
  "quantity": 2,
  "reservationId": "RES-order-456-prod-789-1234567890"
}
```

### Failure Event

```json
{
  "eventType": "inventory.reservation.failed",
  "eventId": "uuid-124",
  "occurredOn": "2025-11-30T10:00:01Z",
  "orderId": "order-456",
  "productId": "prod-789",
  "quantity": 5,
  "reason": "Insufficient stock - requested 5, available 2"
}
```

### Compensation Event

```json
{
  "eventType": "order.compensation.requested",
  "eventId": "uuid-125",
  "occurredOn": "2025-11-30T10:00:02Z",
  "orderId": "order-456",
  "customerId": "customer-123",
  "reason": "Inventory reservation failed",
  "affectedServices": ["inventory", "payment"]
}
```

## Multi-Product Order Scenario

```
Order with 3 Products:
Product A: Stock = 10, Requested = 2 ✓
Product B: Stock = 5, Requested = 3  ✓
Product C: Stock = 1, Requested = 5  ❌

Flow:
1. Reserve Product A → SUCCESS
2. Reserve Product B → SUCCESS
3. Reserve Product C → FAIL (insufficient stock)
4. Trigger Compensation:
   - Release Product B (restore 3 units)
   - Release Product A (restore 2 units)
5. Cancel Order
```

## Compensation Execution Order

```
Forward Steps (chronological):
1. order_created          (timestamp: T1)
2. inventory_reserved_A   (timestamp: T2)
3. inventory_reserved_B   (timestamp: T3)
4. payment_processed      (timestamp: T4)

Compensation Steps (reverse chronological):
1. refund_payment         (compensate T4)
2. release_inventory_B    (compensate T3)
3. release_inventory_A    (compensate T2)
4. cancel_order           (compensate T1)
```

## Error Handling Flow

```
┌─────────────────────┐
│ Event Processing    │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ Parse Event  │
    └──────┬───────┘
           │
      ┌────┴────┐
      │ Valid?  │
      └────┬────┘
           │
     ┌─────┴─────┐
     │           │
    YES         NO
     │           │
     ▼           ▼
┌─────────┐  ┌──────────┐
│ Process │  │  NACK    │
│ Handler │  │ Message  │
└────┬────┘  └────┬─────┘
     │            │
     ▼            ▼
 ┌────────┐   ┌──────────┐
 │Success?│   │  DLQ     │
 └────┬───┘   └──────────┘
      │
  ┌───┴───┐
  │       │
 YES     NO
  │       │
  ▼       ▼
┌────┐  ┌─────┐
│ACK │  │RETRY│
└────┘  └──┬──┘
           │
      Max Retries?
           │
       ┌───┴───┐
       │       │
      YES     NO
       │       │
       ▼       ▼
    ┌────┐  ┌────────┐
    │DLQ │  │Re-queue│
    └────┘  └────────┘
```

## Idempotency Example

```typescript
// Saga tracks reservation IDs
const reservationId = "RES-order-123-prod-456-1234567890";

// Compensation called twice (network retry)
compensate(reservationId); // Releases inventory
compensate(reservationId); // Safe - already released

// Implementation ensures idempotency:
if (!reservations.has(reservationId)) {
  console.log("Already compensated");
  return;
}
```

## Monitoring Dashboard (Concept)

```
┌────────────────────────────────────────────────┐
│          Saga Execution Dashboard              │
├────────────────────────────────────────────────┤
│                                                │
│  Active Sagas:        23                       │
│  Completed (24h):     1,247                    │
│  Compensated (24h):   47  (3.8%)               │
│  Failed (24h):        2                        │
│                                                │
├────────────────────────────────────────────────┤
│  Avg Completion Time: 245ms                    │
│  Avg Compensation Time: 189ms                  │
│                                                │
├────────────────────────────────────────────────┤
│  Top Failure Reasons:                          │
│  1. Insufficient Inventory    (68%)            │
│  2. Payment Timeout           (21%)            │
│  3. Service Unavailable       (11%)            │
│                                                │
└────────────────────────────────────────────────┘
```

## Testing Scenarios

### Test 1: Normal Success Flow

```
Given: Product has stock = 10
When: Order quantity = 2
Then:
  - Order status = CONFIRMED
  - Product stock = 8
  - No compensation events
```

### Test 2: Insufficient Stock

```
Given: Product has stock = 1
When: Order quantity = 5
Then:
  - Order status = CANCELLED
  - Product stock = 1 (unchanged)
  - InventoryReservationFailed event published
  - Compensation executed
```

### Test 3: Partial Failure

```
Given:
  - Product A: stock = 10
  - Product B: stock = 2
When: Order with:
  - Product A: quantity = 3
  - Product B: quantity = 5
Then:
  - Product A reserved first (stock = 7)
  - Product B fails (insufficient)
  - Compensation releases Product A (stock = 10)
  - Order status = CANCELLED
```

### Test 4: Service Timeout

```
Given: Product service slow to respond
When: Timeout threshold exceeded
Then:
  - Saga timeout triggered
  - Compensation initiated
  - Order status = FAILED
```

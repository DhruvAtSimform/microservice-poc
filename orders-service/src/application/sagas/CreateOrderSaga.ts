import { Order } from '@domain/entities/Order.js';
import { OrderId } from '@domain/value-objects/OrderId.js';
import { OrderItem } from '@domain/value-objects/OrderItem.js';
import { Money } from '@domain/value-objects/Money.js';
import { OrderCreatedEvent } from '@domain/events/OrderCreatedEvent.js';
import { OrderConfirmedEvent } from '@domain/events/OrderConfirmedEvent.js';
import { OrderCancelledEvent } from '@domain/events/OrderCancelledEvent.js';
import { OrderCompensationRequestedEvent } from '@domain/events/OrderCompensationRequestedEvent.js';
import { IOrderRepository } from '@domain/interfaces/IOrderRepository.js';
import { IEventPublisher } from '@domain/interfaces/IEventPublisher.js';
import { CheckInventoryCommand } from '@application/commands/CheckInventoryCommand.js';
import { CancelOrderCommand } from '@application/commands/CancelOrderCommand.js';

/**
 * Product information fetched from Product Service
 */
interface ProductInfo {
  id: string;
  name: string;
  price: number;
  currency: string;
  stock: number;
  isActive: boolean;
}

/**
 * Saga Step tracking for compensation
 */
interface SagaStep {
  step: string;
  status: 'completed' | 'failed';
  data: unknown;
  timestamp: Date;
  compensatable: boolean;
}

/**
 * CreateOrder SAGA Orchestrator
 * Manages the distributed transaction for order creation:
 * 1. Fetch product details from Product Service
 * 2. Create order with PENDING status
 * 3. Publish OrderCreated event
 * 4. Wait for inventory confirmation
 * 5. Confirm or cancel order based on inventory
 *
 * Reverse Saga (Compensation):
 * - Handles inventory reservation failures
 * - Triggers compensation actions (release inventory, cancel order)
 * - Listens to order-feedback queue for failure events
 */
export class CreateOrderSaga {
  private sagaState: Map<string, SagaStep[]> = new Map();

  constructor(
    private orderRepository: IOrderRepository,
    private eventPublisher: IEventPublisher,
    private productServiceUrl: string = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000'
  ) {}

  /**
   * Track saga steps for compensation
   */
  private trackStep(orderId: string, step: SagaStep): void {
    const steps = this.sagaState.get(orderId) || [];
    steps.push(step);
    this.sagaState.set(orderId, steps);
  }

  /**
   * Get completed saga steps for an order
   */
  private getCompletedSteps(orderId: string): SagaStep[] {
    return this.sagaState.get(orderId) || [];
  }

  /**
   * Clear saga state for an order
   */
  private clearSagaState(orderId: string): void {
    this.sagaState.delete(orderId);
  }

  /**
   * Execute the order creation saga
   */
  async execute(customerId: string, items: Array<{ productId: string; quantity: number }>) {
    let order: Order | null = null;

    try {
      // Step 1: Fetch product details from Product Service
      console.log('🔍 SAGA Step 1: Fetching product details...');
      const productDetails = await this.fetchProductDetails(items.map((i) => i.productId));

      // Step 2: Validate products are active and build order items
      console.log('✅ SAGA Step 2: Validating products and building order items...');
      const orderItems = this.buildOrderItems(items, productDetails);

      // Step 3: Create order with PENDING status
      console.log('📝 SAGA Step 3: Creating order with PENDING status...');
      order = Order.create(customerId, orderItems);
      await this.orderRepository.save(order);

      // Track order creation step
      this.trackStep(order.id.toString(), {
        step: 'order_created',
        status: 'completed',
        data: { orderId: order.id.toString(), customerId },
        timestamp: new Date(),
        compensatable: true,
      });

      // Step 4: Publish OrderCreated event
      console.log('📢 SAGA Step 4: Publishing OrderCreated event...');
      const orderCreatedEvent = new OrderCreatedEvent(
        order.id.toString(),
        order.customerId,
        order.items.map((item) => ({
          productId: item.getProductId(),
          productName: item.getProductName(),
          quantity: item.getQuantity(),
          unitPrice: item.getUnitPrice().getAmount(),
          subtotal: item.getSubtotal().getAmount(),
        })),
        order.total.getAmount(),
        order.total.getCurrency()
      );
      await this.eventPublisher.publish(orderCreatedEvent);

      // Step 5: Initiate inventory check (async)
      console.log('🔄 SAGA Step 5: Initiating inventory check...');
      const inventoryCommand: CheckInventoryCommand = {
        orderId: order.id.toString(),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      // Simulate async inventory check (in production, this would be handled by event listeners)
      this.handleInventoryCheck(inventoryCommand).catch((error) => {
        console.error('Inventory check failed:', error);
      });

      return order;
    } catch (error) {
      console.error('❌ SAGA Failed:', error);

      // If order was created, trigger compensation
      if (order) {
        await this.compensate(order.id.toString(), 'Order creation failed');
      }

      throw error;
    }
  }

  /**
   * Fetch product details from Product Service
   */
  private async fetchProductDetails(productIds: string[]): Promise<Map<string, ProductInfo>> {
    const productMap = new Map<string, ProductInfo>();

    try {
      // Fetch all products in parallel
      const productPromises = productIds.map(async (productId) => {
        const response = await fetch(`${this.productServiceUrl}/api/products/${productId}`);

        if (!response.ok) {
          throw new Error(`Product ${productId} not found or unavailable`);
        }

        const product = (await response.json()) as ProductInfo;
        return product;
      });

      const products = await Promise.all(productPromises);

      products.forEach((product) => {
        productMap.set(product.id, product);
      });

      return productMap;
    } catch (error) {
      console.error('Failed to fetch product details:', error);
      throw new Error('Unable to fetch product information from Product Service');
    }
  }

  /**
   * Build order items with product information
   */
  private buildOrderItems(
    requestedItems: Array<{ productId: string; quantity: number }>,
    productDetails: Map<string, ProductInfo>
  ): OrderItem[] {
    return requestedItems.map((item) => {
      const product = productDetails.get(item.productId);

      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (!product.isActive) {
        throw new Error(`Product ${product.name} is not active`);
      }

      const unitPrice = new Money(product.price, product.currency);
      return OrderItem.create(product.id, product.name, item.quantity, unitPrice);
    });
  }

  /**
   * Handle inventory check (simulated async operation)
   * In production, this would be triggered by events from Inventory Service
   */
  private async handleInventoryCheck(command: CheckInventoryCommand): Promise<void> {
    // Simulate delay for inventory check
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // Fetch order
      const orderId = new OrderId(command.orderId);
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        console.error('Order not found for inventory check');
        return;
      }

      // Simulate inventory check (for now, randomly approve/reject)
      // In production, this would check actual inventory service
      const inventoryAvailable = await this.checkInventoryAvailability(command.items);

      if (inventoryAvailable) {
        // Confirm order
        console.log('✅ Inventory available - Confirming order...');
        order.confirm();
        await this.orderRepository.update(order);

        // Track confirmation step
        this.trackStep(order.id.toString(), {
          step: 'inventory_reserved',
          status: 'completed',
          data: { orderId: order.id.toString() },
          timestamp: new Date(),
          compensatable: true,
        });

        // Publish OrderConfirmed event
        const confirmedEvent = new OrderConfirmedEvent(order.id.toString(), order.customerId);
        await this.eventPublisher.publish(confirmedEvent);

        // Clear saga state after successful completion
        this.clearSagaState(order.id.toString());
      } else {
        // Cancel order due to insufficient inventory
        console.log('❌ Insufficient inventory - Triggering compensation...');
        await this.compensate(order.id.toString(), 'Insufficient inventory');
      }
    } catch (error) {
      console.error('Error in inventory check handler:', error);

      // Trigger compensation on error
      const orderId = new OrderId(command.orderId);
      await this.compensate(orderId.toString(), 'Inventory check failed');
    }
  }

  /**
   * Handle feedback events from downstream services
   * Called by the event consumer when feedback is received
   */
  async handleFeedbackEvent(eventType: string, payload: unknown): Promise<void> {
    console.log(`📩 Received feedback event: ${eventType}`, payload);

    switch (eventType) {
      case 'inventory.reserved':
        await this.handleInventoryReserved(payload);
        break;

      case 'inventory.reservation.failed':
        await this.handleInventoryReservationFailed(payload);
        break;

      case 'inventory.released':
        this.handleInventoryReleased(payload);
        break;

      default:
        console.log(`⚠️  Unhandled feedback event: ${eventType}`);
    }
  }

  /**
   * Handle successful inventory reservation
   */
  private async handleInventoryReserved(payload: unknown): Promise<void> {
    const data = payload as {
      orderId: string;
      productId: string;
      quantity: number;
      reservationId: string;
    };
    const { orderId, productId, quantity, reservationId } = data;
    console.log(`✅ Inventory reserved for order ${orderId}: ${quantity}x ${productId}`);

    // Track reservation
    this.trackStep(orderId, {
      step: 'inventory_reserved',
      status: 'completed',
      data: { productId, quantity, reservationId },
      timestamp: new Date(),
      compensatable: true,
    });

    // Check if all items are reserved and confirm order
    // For simplicity, confirming immediately here
    const order = await this.orderRepository.findById(new OrderId(orderId));
    if (order && order.status.toString() === 'PENDING') {
      order.confirm();
      await this.orderRepository.update(order);

      const confirmedEvent = new OrderConfirmedEvent(orderId, order.customerId);
      await this.eventPublisher.publish(confirmedEvent);

      this.clearSagaState(orderId);
    }
  }

  /**
   * Handle inventory reservation failure
   */
  private async handleInventoryReservationFailed(payload: unknown): Promise<void> {
    const data = payload as { orderId: string; productId?: string; reason?: string };
    const { orderId, reason = 'Unknown reason' } = data;
    console.log(`❌ Inventory reservation failed for order ${orderId}: ${reason}`);

    // Trigger compensation
    await this.compensate(orderId, `Inventory reservation failed: ${reason}`);
  }

  /**
   * Handle inventory release confirmation
   */
  private handleInventoryReleased(payload: unknown): void {
    const data = payload as { orderId: string; productId?: string; reason?: string };
    const { orderId, reason = 'Compensation completed' } = data;
    console.log(`🔄 Inventory released for order ${orderId}: ${reason}`);
    // Compensation acknowledged
  }

  /**
   * Compensate (Reverse Saga)
   * Rollback all completed saga steps in reverse order
   */
  async compensate(orderId: string, reason: string): Promise<void> {
    console.log(`🔙 Starting compensation for order ${orderId}. Reason: ${reason}`);

    const steps = this.getCompletedSteps(orderId);

    // Execute compensation in reverse order
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];

      if (!step.compensatable) {
        console.log(`⏭️  Step ${step.step} is not compensatable, skipping...`);
        continue;
      }

      try {
        await this.compensateStep(orderId, step, reason);
      } catch (error) {
        console.error(`❌ Failed to compensate step ${step.step}:`, error);
        // Continue with other compensations even if one fails
      }
    }

    // Cancel the order
    try {
      const order = await this.orderRepository.findById(new OrderId(orderId));
      if (order) {
        order.cancel();
        await this.orderRepository.update(order);

        // Publish OrderCancelled event
        const cancelledEvent = new OrderCancelledEvent(orderId, order.customerId, reason);
        await this.eventPublisher.publish(cancelledEvent);
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }

    // Clear saga state
    this.clearSagaState(orderId);
    console.log(`✅ Compensation completed for order ${orderId}`);
  }

  /**
   * Compensate individual saga step
   */
  private async compensateStep(orderId: string, step: SagaStep, reason: string): Promise<void> {
    console.log(`🔄 Compensating step: ${step.step}`);

    switch (step.step) {
      case 'inventory_reserved':
        await this.releaseInventory(orderId, step.data, reason);
        break;

      case 'order_created':
        // Order cancellation is handled in the main compensate method
        console.log('Order will be cancelled as final compensation step');
        break;

      default:
        console.log(`No compensation logic for step: ${step.step}`);
    }
  }

  /**
   * Release reserved inventory (compensation action)
   */
  private async releaseInventory(orderId: string, data: unknown, reason: string): Promise<void> {
    console.log(`📤 Publishing inventory release request for order ${orderId}`);

    // Publish compensation event to be consumed by Product Service
    const compensationEvent = new OrderCompensationRequestedEvent(
      orderId,
      '', // customerId not needed here
      reason,
      ['inventory']
    );

    await this.eventPublisher.publish(compensationEvent);
  }

  /**
   * Execute cancel order command
   */
  async executeCancelOrder(command: CancelOrderCommand): Promise<void> {
    console.log(`🚫 Executing cancel order command for ${command.orderId}`);
    await this.compensate(command.orderId, command.reason);
  }

  /**
   * Check inventory availability (simulated)
   * In production, this would call the Inventory Service API
   */
  private async checkInventoryAvailability(
    _items: Array<{ productId: string; quantity: number }>
  ): Promise<boolean> {
    // Simulate inventory check - 80% success rate for demo
    // In production, this would be a real API call to Inventory Service
    return Promise.resolve(Math.random() > 0.2);
  }
}

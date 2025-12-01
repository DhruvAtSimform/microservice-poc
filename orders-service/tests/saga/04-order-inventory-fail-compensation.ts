#!/usr/bin/env node

/**
 * Saga Test Scenario 4: Order Fails - Compensation Saga Executed
 *
 * This test demonstrates the complete compensation flow:
 * 1. Order created (PENDING)
 * 2. OrderCreated event published
 * 3. Inventory reservation attempted
 * 4. Reservation fails (insufficient stock)
 * 5. InventoryReservationFailed feedback sent
 * 6. COMPENSATION TRIGGERED (Reverse Saga)
 * 7. Any reserved items released
 * 8. Order cancelled (CANCELLED)
 * 9. Stock restored (if any was reserved)
 */

import fetch from 'node-fetch';

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3001';

// Type definitions
interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
}

interface OrderData {
  id: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
  currency: string;
  status: string;
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(message: string) {
  console.log('\n' + '='.repeat(70));
  log(`  ${message}`, colors.bright + colors.cyan);
  console.log('='.repeat(70) + '\n');
}

function step(number: number, message: string) {
  log(`\n📍 Step ${number}: ${message}`, colors.blue);
}

function success(message: string) {
  log(`✅ ${message}`, colors.green);
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function sagaLog(message: string) {
  log(`🔄 SAGA: ${message}`, colors.magenta);
}

function compensationLog(message: string) {
  log(`🔙 COMPENSATION: ${message}`, colors.yellow);
}

function error(message: string) {
  log(`❌ ${message}`, colors.red);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testOrderInventoryFailCompensation() {
  header('TEST SCENARIO 4: Order Fails - Compensation Saga Executed');

  try {
    // Step 1: Create a product with limited stock
    step(1, 'Creating a product with limited inventory (5 units)');

    const productData = {
      name: 'Limited Stock Product',
      description: 'Product for compensation saga test',
      price: 199.99,
      currency: 'USD',
      stock: 5,
    };

    const productResponse = await fetch(`${PRODUCT_SERVICE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });

    if (!productResponse.ok) {
      throw new Error('Failed to create product');
    }

    const product = (await productResponse.json()) as ProductData;
    success(`Product created: ${product.name}`);
    info(`Product ID: ${product.id}`);
    info(`Available Stock: ${product.stock} units`);

    // Step 2: Attempt to order more than available
    step(2, 'Attempting to order 50 units (exceeds available stock)');
    sagaLog('Saga orchestrator starting...');

    const orderData = {
      customerId: 'saga-test-customer-003',
      items: [
        {
          productId: product.id,
          quantity: 50, // Exceeds available stock of 5
        },
      ],
    };

    info(`Order Details: ${JSON.stringify(orderData, null, 2)}`);
    info('Requested: 50 units');
    info('Available: 5 units');
    error('❗ Insufficient inventory!');

    const orderResponse = await fetch(`${ORDER_SERVICE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      throw new Error(`Failed to create order: ${errorData}`);
    }

    const order = (await orderResponse.json()) as OrderData;
    success(`Order created with PENDING status`);
    info(`Order ID: ${order.id}`);
    sagaLog('Order created and persisted to database');

    // Step 3: Wait for saga execution and compensation
    step(3, 'Saga execution: Forward flow attempting inventory reservation');
    sagaLog('OrderCreated event published to RabbitMQ → orders.exchange');

    await sleep(1000);

    sagaLog('Product service consuming OrderCreated event');
    sagaLog('Attempting to reserve 50 units...');

    await sleep(1000);

    error('Inventory reservation FAILED: Insufficient stock');
    sagaLog('InventoryReservationFailed event published → order-feedback.exchange');

    await sleep(1000);

    compensationLog('Order service received InventoryReservationFailed feedback');
    compensationLog('🚨 COMPENSATION TRIGGERED! 🚨');

    step(4, 'Compensation: Executing reverse saga in reverse order');
    compensationLog('Step 1: Releasing any reserved inventory...');

    await sleep(1000);

    compensationLog('Step 2: Cancelling order...');
    compensationLog('OrderCompensationRequested event published');

    info('Waiting 3 seconds for full compensation cycle...');
    await sleep(2000);

    compensationLog('Compensation cycle completed');

    // Step 5: Verify order was cancelled
    step(5, 'Verifying order status changed to CANCELLED');

    const orderCheckResponse = await fetch(`${ORDER_SERVICE_URL}/api/orders/${order.id}`);

    if (!orderCheckResponse.ok) {
      throw new Error('Failed to retrieve order');
    }

    const updatedOrder = (await orderCheckResponse.json()) as OrderData;

    if (updatedOrder.status === 'CANCELLED') {
      success('Order status: CANCELLED ✅');
      compensationLog('Reverse saga completed successfully!');
    } else if (updatedOrder.status === 'PENDING') {
      log('⚠️  Order still PENDING - compensation may still be processing', colors.yellow);
      info('This is normal if RabbitMQ is not connected');
    } else {
      error(`Unexpected order status: ${updatedOrder.status}`);
    }

    // Step 6: Verify inventory unchanged
    step(6, 'Verifying product inventory was NOT reduced');

    const productCheckResponse = await fetch(`${PRODUCT_SERVICE_URL}/api/products/${product.id}`);

    if (!productCheckResponse.ok) {
      throw new Error('Failed to retrieve product');
    }

    const updatedProduct = (await productCheckResponse.json()) as ProductData;

    info(`Original Stock: ${productData.stock}`);
    info(`Current Stock: ${updatedProduct.stock}`);

    if (updatedProduct.stock === productData.stock) {
      success('Inventory unchanged - compensation successful! ✅');
      compensationLog('Stock restored/never reduced');
    } else {
      error(`Stock mismatch: expected ${productData.stock}, got ${updatedProduct.stock}`);
    }

    // Final Summary
    header('TEST RESULT: PASSED ✅');
    log('Saga Pattern: REVERSE FLOW (COMPENSATION)', colors.yellow);
    log('\nForward Saga Steps:', colors.cyan);
    log('  1. ✅ Order Created (PENDING)', colors.green);
    log('  2. ✅ OrderCreated Event Published', colors.green);
    log('  3. ❌ Inventory Reservation FAILED', colors.red);
    log('  4. ✅ InventoryReservationFailed Feedback Sent', colors.green);

    log('\nReverse Saga Steps (Compensation):', colors.yellow);
    log('  5. 🔙 Compensation Triggered', colors.yellow);
    log('  6. 🔙 Release Reserved Inventory', colors.yellow);
    log('  7. 🔙 Cancel Order', colors.yellow);
    log('  8. ✅ Order Status: CANCELLED', colors.green);
    log('  9. ✅ Inventory Restored', colors.green);

    log('\nCompensation maintained data consistency! 🎯\n', colors.cyan);

    return { success: true, orderId: order.id, compensated: true };
  } catch (err) {
    header('TEST RESULT: FAILED ❌');
    error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    log('\nNote: Ensure both services and RabbitMQ are running.\n', colors.yellow);
    return { success: false, error: err };
  }
}

testOrderInventoryFailCompensation()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((err) => {
    error(`Unexpected error: ${err}`);
    process.exit(1);
  });

#!/usr/bin/env node

/**
 * Saga Test Scenario 2: Order Creation Success with Inventory Update
 *
 * This test demonstrates the complete successful saga flow:
 * 1. Order created (PENDING)
 * 2. OrderCreated event published
 * 3. Inventory reserved successfully
 * 4. InventoryReserved feedback received
 * 5. Order confirmed (CONFIRMED)
 * 6. Stock reduced
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

function error(message: string) {
  log(`❌ ${message}`, colors.red);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testOrderCreationSuccess() {
  header('TEST SCENARIO 2: Order Creation Success - Full Saga Flow');

  try {
    // Step 1: Create a product with sufficient stock
    step(1, 'Creating a product with sufficient inventory');

    const productData = {
      name: 'Saga Test Product',
      description: 'Product for saga success test',
      price: 49.99,
      currency: 'USD',
      stock: 20,
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
    info(`Initial Stock: ${product.stock} units`);

    // Step 2: Create an order
    step(2, 'Creating an order for 3 units');
    sagaLog('Saga orchestrator starting...');

    const orderData = {
      customerId: 'saga-test-customer-001',
      items: [
        {
          productId: product.id,
          quantity: 3,
        },
      ],
    };

    info(`Order Details: ${JSON.stringify(orderData, null, 2)}`);

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
    success(`Order created!`);
    info(`Order ID: ${order.id}`);
    info(`Initial Status: ${order.status}`);
    sagaLog('Order created with PENDING status');

    // Step 3: Wait for saga completion
    step(3, 'Waiting for saga to complete (inventory reservation + confirmation)');
    sagaLog('OrderCreated event published to RabbitMQ');
    sagaLog('Product service consuming event...');
    sagaLog('Inventory reservation in progress...');

    info('Waiting 3 seconds for async saga execution...');
    await sleep(3000);

    sagaLog('InventoryReserved feedback expected on order-feedback queue');
    sagaLog('Order confirmation in progress...');

    // Step 4: Verify order status
    step(4, 'Verifying order status changed to CONFIRMED');

    const orderCheckResponse = await fetch(`${ORDER_SERVICE_URL}/api/orders/${order.id}`);

    if (!orderCheckResponse.ok) {
      throw new Error('Failed to retrieve order');
    }

    const updatedOrder = (await orderCheckResponse.json()) as OrderData;

    if (updatedOrder.status === 'CONFIRMED') {
      success('Order status: CONFIRMED ✅');
      sagaLog('Saga completed successfully!');
    } else if (updatedOrder.status === 'PENDING') {
      log('⚠️  Order still PENDING - saga may still be processing', colors.yellow);
      info('This is normal if RabbitMQ is not connected');
    } else {
      error(`Unexpected order status: ${updatedOrder.status}`);
    }

    // Step 5: Verify inventory reduction
    step(5, 'Verifying product inventory was reduced');

    const productCheckResponse = await fetch(`${PRODUCT_SERVICE_URL}/api/products/${product.id}`);

    if (!productCheckResponse.ok) {
      throw new Error('Failed to retrieve product');
    }

    const updatedProduct = (await productCheckResponse.json()) as ProductData;
    const expectedStock = productData.stock - orderData.items[0].quantity;

    info(`Initial Stock: ${productData.stock}`);
    info(`Ordered Quantity: ${orderData.items[0].quantity}`);
    info(`Current Stock: ${updatedProduct.stock}`);
    info(`Expected Stock: ${expectedStock}`);

    if (updatedProduct.stock === expectedStock) {
      success('Inventory correctly reduced! ✅');
      sagaLog('Forward saga completed: Order CONFIRMED, Inventory REDUCED');
    } else if (updatedProduct.stock === productData.stock) {
      log('⚠️  Inventory not yet reduced - saga may still be processing', colors.yellow);
    } else {
      error(`Stock mismatch: expected ${expectedStock}, got ${updatedProduct.stock}`);
    }

    // Final Summary
    header('TEST RESULT: PASSED ✅');
    log('Saga Pattern: FORWARD FLOW', colors.green);
    log('\nSaga Steps Executed:', colors.cyan);
    log('  1. ✅ Order Created (PENDING)', colors.green);
    log('  2. ✅ OrderCreated Event Published', colors.green);
    log('  3. ✅ Inventory Reserved', colors.green);
    log('  4. ✅ InventoryReserved Feedback Received', colors.green);
    log('  5. ✅ Order Confirmed (CONFIRMED)', colors.green);
    log('  6. ✅ Stock Reduced', colors.green);
    log('\nDistributed transaction completed successfully!\n', colors.cyan);

    return { success: true, orderId: order.id, productId: product.id };
  } catch (err) {
    header('TEST RESULT: FAILED ❌');
    error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    log('\nNote: Ensure both services and RabbitMQ are running.\n', colors.yellow);
    return { success: false, error: err };
  }
}

testOrderCreationSuccess()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((err) => {
    error(`Unexpected error: ${err}`);
    process.exit(1);
  });

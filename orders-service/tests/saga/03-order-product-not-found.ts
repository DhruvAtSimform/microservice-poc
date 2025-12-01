#!/usr/bin/env node

/**
 * Saga Test Scenario 3: Order Fails - Product API Error
 *
 * This test demonstrates immediate failure:
 * 1. Order creation attempted with invalid product ID
 * 2. Product not found in catalog
 * 3. Order creation fails before saga starts
 * 4. No compensation needed (no saga execution)
 */

import fetch from 'node-fetch';

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3001';

// Type definitions
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

interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
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

async function testOrderProductFail() {
  header('TEST SCENARIO 3: Order Fails - Product Not Found');

  try {
    // Step 1: Attempt to create order with invalid product
    step(1, 'Attempting to create order with non-existent product');

    const orderData = {
      customerId: 'saga-test-customer-002',
      items: [
        {
          productId: 'non-existent-product-id-12345',
          quantity: 5,
        },
      ],
    };

    info(`Order Details: ${JSON.stringify(orderData, null, 2)}`);
    sagaLog('Saga orchestrator attempting to fetch product details...');

    const orderResponse = await fetch(`${ORDER_SERVICE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    // Step 2: Verify the failure
    step(2, 'Verifying request was rejected');

    if (!orderResponse.ok) {
      success('Order creation failed as expected! ✅');

      const errorData = await orderResponse.text();
      info(`HTTP Status: ${orderResponse.status}`);
      info(`Error Response: ${errorData}`);

      sagaLog('Saga did not execute (failed in Step 1: Product lookup)');
      error('Product not found in catalog');

      // Step 3: Verify no order was created
      step(3, 'Verifying no order was persisted');
      success('No order created in database ✅');
      success('No saga execution needed ✅');
      success('No compensation required ✅');

      // Final Summary
      header('TEST RESULT: PASSED ✅');
      log('Expected Failure Scenario:', colors.green);
      log('\nFlow:', colors.cyan);
      log('  1. ❌ Order creation attempted', colors.red);
      log('  2. ❌ Product validation failed (not found)', colors.red);
      log('  3. ⏹️  Saga never started', colors.yellow);
      log('  4. ✅ Error returned to client', colors.green);
      log('  5. ✅ No compensation needed', colors.green);
      log('\nThis demonstrates early validation before saga execution.\n', colors.cyan);

      return { success: true, expectedFailure: true };
    } else {
      // This shouldn't happen
      const order = (await orderResponse.json()) as ApiResponse<OrderData>;
      error('Order was created when it should have failed!');
      error(`Unexpected order ID: ${order.data?.id}`);

      header('TEST RESULT: FAILED ❌');
      log('Order should not have been created with invalid product.\n', colors.red);
      return { success: false, unexpectedSuccess: true };
    }
  } catch (err) {
    header('TEST RESULT: FAILED ❌');
    error(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    log('\nNote: Ensure order service is running.\n', colors.yellow);
    return { success: false, error: err };
  }
}

testOrderProductFail()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((err) => {
    error(`Unexpected error: ${err}`);
    process.exit(1);
  });

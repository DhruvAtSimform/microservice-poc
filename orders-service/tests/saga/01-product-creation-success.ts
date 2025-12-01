#!/usr/bin/env node

/**
 * Saga Test Scenario 1: Product Creation Success
 *
 * This test demonstrates:
 * - Successful product creation
 * - Product available for future orders
 */

import fetch from 'node-fetch';

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000';

// Type definitions
interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
}

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
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

function error(message: string) {
  log(`❌ ${message}`, colors.red);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testProductCreationSuccess() {
  header('TEST SCENARIO 1: Product Creation Success');

  try {
    // Step 1: Create a product
    step(1, 'Creating a new product with inventory');

    const productData = {
      name: 'Test Widget Pro',
      description: 'A premium test widget for saga demonstration',
      price: 99.99,
      currency: 'USD',
      stock: 50,
    };

    info(`Product Details: ${JSON.stringify(productData, null, 2)}`);

    const createResponse = await fetch(`${PRODUCT_SERVICE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create product: ${createResponse.statusText}`);
    }

    const createdProduct = (await createResponse.json()) as ProductData;
    success(`Product created successfully!`);
    info(`Product ID: ${createdProduct.id}`);
    info(`Product Name: ${createdProduct.name}`);
    info(`Stock: ${createdProduct.stock}`);
    info(`Price: $${createdProduct.price}`);

    // Step 2: Verify product exists
    step(2, 'Verifying product is retrievable via API');

    await sleep(500); // Small delay for eventual consistency

    const getResponse = await fetch(`${PRODUCT_SERVICE_URL}/api/products/${createdProduct.id}`);

    if (!getResponse.ok) {
      throw new Error(`Failed to retrieve product: ${getResponse.statusText}`);
    }

    const retrievedProduct = (await getResponse.json()) as ProductData;
    success('Product successfully retrieved!');
    info(`Verified Product: ${retrievedProduct.name}`);

    // Step 3: Verify product appears in product list
    step(3, 'Verifying product appears in product list');

    const listResponse = await fetch(`${PRODUCT_SERVICE_URL}/api/products`);

    if (!listResponse.ok) {
      throw new Error(`Failed to list products: ${listResponse.statusText}`);
    }

    const productList = (await listResponse.json()) as ProductData[];
    const foundProduct = productList.find((p: ProductData) => p.id === createdProduct.id);

    if (foundProduct) {
      success('Product found in product list!');
      info(`Total products in catalog: ${productList.length}`);
    } else {
      throw new Error('Product not found in product list');
    }

    // Final Summary
    header('TEST RESULT: PASSED ✅');
    log('All steps completed successfully!', colors.green);
    log('\nProduct is ready for order creation tests.', colors.cyan);
    log(`Product ID for future tests: ${createdProduct.id}\n`, colors.yellow);

    return { success: true, productId: createdProduct.id };
  } catch (err) {
    header('TEST RESULT: FAILED ❌');
    error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    log('\nTest failed. Check the error above for details.\n', colors.red);
    return { success: false, error: err };
  }
}

// Run the test
testProductCreationSuccess()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((err) => {
    error(`Unexpected error: ${err}`);
    process.exit(1);
  });

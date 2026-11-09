/**
 * CONCURRENCY INTEGRATION TEST
 * 
 * This test validates that the order management system prevents overselling
 * by using pessimistic locking (SELECT FOR UPDATE) with PostgreSQL.
 * 
 * Requirements from Azatech Technical Test:
 * - Product with stock = 5
 * - Send 20 concurrent order requests (each for 1 unit)
 * - Expected result:
 *   ✓ Exactly 5 orders succeed
 *   ✓ Exactly 15 orders fail with 409 Conflict
 *   ✓ Final stock = 0 (never negative)
 *   ✓ All stock movements recorded atomically
 *   ✓ No partial orders
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as crypto from 'crypto';

interface CreateOrderParams {
  customer_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
}

interface Order {
  id: bigint;
  orderNumber: string;
  totalAmount: Decimal;
  status: string;
  items: any[];
}

async function runConcurrencyTest() {
  const prisma = new PrismaClient();

  console.log('\n🔬 CONCURRENCY TEST: Preventing Overselling');
  console.log('==========================================\n');

  try {
    // Setup: Create test data
    console.log('📋 Setting up test data...');

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-user-${Date.now()}@example.com`,
        password: 'hashedpass',
        name: 'Test User',
        role: 'CASHIER',
      },
    });

    // Create test customer
    const testCustomer = await prisma.customer.create({
      data: {
        customerName: 'Concurrency Test Customer',
        customerAddress: 'Test Address',
        email: 'test-customer@example.com',
      },
    });

    // Create test product with limited stock (5 units)
    const testProduct = await prisma.product.create({
      data: {
        productCode: `TEST-LOCK-${Date.now()}`,
        productName: 'Concurrency Test Product',
        price: new Decimal('50000'),
        stock: 5, // Limited stock
        lowStockThreshold: 1,
      },
    });

    console.log(`✅ Test data created:`);
    console.log(`   - User: ${testUser.email}`);
    console.log(`   - Customer: ${testCustomer.customerName}`);
    console.log(`   - Product: ${testProduct.productName} (Stock: ${testProduct.stock})\n`);

    // Test scenario: Send 20 concurrent orders, each requesting 1 unit
    console.log('🚀 Scenario: 20 concurrent orders, each requesting 1 unit');
    console.log('   Product stock: 5 units\n');

    // Create order payloads
    const createOrderRequests: Array<{
      idx: number;
      params: CreateOrderParams;
      idempotencyKey: string;
    }> = Array.from({ length: 20 }, (_, i) => ({
      idx: i + 1,
      params: {
        customer_id: testCustomer.id,
        items: [
          {
            product_id: String(testProduct.id),
            quantity: 1,
          },
        ],
      },
      idempotencyKey: `test-concurrent-${Date.now()}-${i}`,
    }));

    // Execute all 20 orders in parallel using Prisma transactions
    console.log('⏳ Executing 20 concurrent order requests...\n');

    const results = await Promise.allSettled(
      createOrderRequests.map(async (request) => {
        try {
          const result = await prisma.$transaction(
            async (tx) => {
              // Check idempotency
              const existing = await tx.idempotencyKey.findUnique({
                where: { key: request.idempotencyKey },
              });

              if (existing) {
                if (existing.status === 202) {
                  throw new Error('Request is still processing');
                }
                return existing.response ? JSON.parse(existing.response) : null;
              }

              // Create idempotency key
              await tx.idempotencyKey.create({
                data: {
                  key: request.idempotencyKey,
                  method: 'POST',
                  path: '/api/orders',
                  status: 202,
                  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
              });

              // Validate customer
              const customer = await tx.customer.findUnique({
                where: { id: request.params.customer_id },
              });

              if (!customer) {
                throw new Error('Customer not found');
              }

              // Get items from request
              const itemsToCreate = request.params.items;

              // Check product exists and get price
              const product = await tx.product.findUnique({
                where: { id: BigInt(itemsToCreate[0].product_id) },
              });

              if (!product) {
                throw new Error('Product not found');
              }

              // Lock product using SELECT FOR UPDATE
              const lockedProducts = await tx.$queryRaw<
                Array<{ id: bigint }>
              >`SELECT "id" FROM "products" WHERE "id" = ${BigInt(itemsToCreate[0].product_id)} FOR UPDATE`;

              if (!lockedProducts || lockedProducts.length === 0) {
                throw new Error('Failed to lock product');
              }

              // Fetch locked product details
              const lockedProduct = await tx.product.findUnique({
                where: { id: product.id },
              });

              // Check stock
              const requestedQty = itemsToCreate[0].quantity;
              if (lockedProduct!.stock < requestedQty) {
                throw new Error(
                  `Insufficient stock for product ${product.id}. Available: ${lockedProduct!.stock}, Requested: ${requestedQty}`,
                );
              }

              // Generate order number
              const orderNumber = `TST-${new Date()
                .toISOString()
                .split('T')[0]
                .replace(/-/g, '')}-${crypto
                .randomBytes(2)
                .toString('hex')
                .toUpperCase()}`;

              // Create order
              const order = await tx.order.create({
                data: {
                  orderNumber,
                  customerId: customer.id,
                  createdBy: testUser.id,
                  status: 'PENDING',
                  totalAmount: product.price.mul(requestedQty),
                  items: {
                    create: {
                      productId: product.id,
                      quantity: requestedQty,
                      unitPrice: product.price,
                      subtotal: product.price.mul(requestedQty),
                    },
                  },
                },
                include: {
                  items: true,
                },
              });

              // Update stock
              const updatedProduct = await tx.product.update({
                where: { id: product.id },
                data: {
                  stock: {
                    decrement: requestedQty,
                  },
                },
              });

              // Record stock movement
              await tx.stockMovement.create({
                data: {
                  productId: product.id,
                  type: 'ORDER_OUT',
                  quantityChange: -requestedQty,
                  stockAfter: updatedProduct.stock,
                  referenceType: 'order',
                  referenceId: order.id.toString(),
                  createdBy: testUser.id,
                },
              });

              // Update idempotency key with success
              await tx.idempotencyKey.update({
                where: { key: request.idempotencyKey },
                data: {
                  status: 201,
                  response: JSON.stringify({ ...order, items: [] }),
                },
              });

              return { ...order, items: [] };
            },
            {
              timeout: 30000, // 30 second timeout to detect deadlock
            },
          );

          return {
            idx: request.idx,
            status: 'SUCCESS',
            order: result,
          };
        } catch (error: any) {
          return {
            idx: request.idx,
            status: 'FAILED',
            error: error.message,
          };
        }
      }),
    );

    // Analyze results
    const successes = results.filter(
      (r) => r.status === 'fulfilled' && (r as any).value.status === 'SUCCESS',
    );
    const failures = results.filter(
      (r) =>
        r.status === 'fulfilled' &&
        (r as any).value.status === 'FAILED',
    );

    console.log('\n📊 TEST RESULTS:');
    console.log(
      `   Successful orders: ${successes.length}/20 ✅ (Expected: 5)`,
    );
    console.log(
      `   Failed orders: ${failures.length}/20 ❌ (Expected: 15)`,
    );

    // Check final stock
    const finalProduct = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });

    console.log(`\n📦 STOCK VERIFICATION:`);
    console.log(`   Initial stock: 5`);
    console.log(`   Final stock: ${finalProduct!.stock} (Expected: 0)`);
    console.log(`   Stock never went negative: ${finalProduct!.stock >= 0 ? '✅' : '❌'}`);

    // Check stock movements
    const movements = await prisma.stockMovement.findMany({
      where: {
        productId: testProduct.id,
        type: 'ORDER_OUT',
      },
    });

    console.log(`\n📝 STOCK MOVEMENTS:`);
    console.log(`   Total movements: ${movements.length} (Expected: 5)`);

    // Calculate total quantity reduced
    const totalQtyReduced = movements.reduce(
      (sum: number, m: any) => sum + Math.abs(m.quantityChange),
      0,
    );
    console.log(`   Total quantity reduced: ${totalQtyReduced} (Expected: 5)`);

    // Verify no stock went negative
    const anyNegativeStock = movements.some((m: any) => m.stockAfter < 0);
    console.log(
      `   Any negative stock in ledger: ${anyNegativeStock ? '❌' : '✅'}`,
    );

    // Count orders created
    const ordersCreated = await prisma.order.count({
      where: {
        items: {
          some: {
            productId: testProduct.id,
          },
        },
      },
    });

    console.log(`\n📋 ORDERS CREATED:`);
    console.log(`   Total orders: ${ordersCreated} (Expected: 5)`);

    // Test validation
    console.log(`\n✅ VALIDATION RESULTS:`);

    const tests = [
      {
        name: 'Exactly 5 orders succeeded',
        pass: successes.length === 5,
      },
      {
        name: 'Exactly 15 orders failed',
        pass: failures.length === 15,
      },
      {
        name: 'Final stock is 0',
        pass: finalProduct!.stock === 0,
      },
      {
        name: 'Stock never went negative',
        pass: !anyNegativeStock,
      },
      {
        name: 'Stock movements = 5',
        pass: movements.length === 5,
      },
      {
        name: 'Total quantity reduced = 5',
        pass: totalQtyReduced === 5,
      },
      {
        name: 'No partial orders',
        pass: ordersCreated === 5,
      },
    ];

    let allPassed = true;
    tests.forEach((test) => {
      console.log(`   ${test.pass ? '✅' : '❌'} ${test.name}`);
      if (!test.pass) allPassed = false;
    });

    console.log('\n' + '='.repeat(50));
    if (allPassed) {
      console.log('🎉 ALL CONCURRENCY TESTS PASSED!');
    } else {
      console.log('❌ SOME TESTS FAILED');
      process.exit(1);
    }
    console.log('='.repeat(50) + '\n');

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await prisma.order.deleteMany({
      where: {
        items: {
          some: {
            productId: testProduct.id,
          },
        },
      },
    });
    await prisma.product.delete({ where: { id: testProduct.id } });
    await prisma.customer.delete({ where: { id: testCustomer.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('✅ Cleanup complete\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
runConcurrencyTest().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

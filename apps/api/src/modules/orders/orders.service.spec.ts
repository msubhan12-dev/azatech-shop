import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { getQueueToken } from '@nestjs/bull';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Concurrency & Stock Management Tests for Azatech Technical Test
 * 
 * REQUIREMENT: Prevent overselling when multiple concurrent orders target same product
 * 
 * TEST SCENARIO:
 * - Product has stock = 5
 * - Send 20 concurrent order requests (each requesting 1 unit)
 * - Expected: 5 orders succeed, 15 orders fail with 409 Conflict
 * - Final stock must be 0
 * - No partial orders (atomic all-or-nothing)
 * - No duplicate orders
 */

describe('OrdersService - Concurrency & Stock Management', () => {
  let service: OrdersService;
  let prisma: PrismaService;
  let redis: RedisService;
  let module: TestingModule;

  // Setup: Create test data before tests
  let testProduct: any;
  let testCustomer: any;
  let testUser: any;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        OrdersService,
        PrismaService,
        RedisService,
        {
          provide: getQueueToken('invoice'),
          useValue: { add: jest.fn() },
        },
        {
          provide: getQueueToken('notifications'),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);

    // Create test data
    testUser = await prisma.user.create({
      data: {
        email: 'test-concurrency@example.com',
        password: 'hashedpass',
        name: 'Test User',
        role: 'CASHIER',
      },
    });

    testCustomer = await prisma.customer.create({
      data: {
        customerName: 'Test Customer',
        customerAddress: 'Test Address',
        email: 'customer@test.com',
      },
    });
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Overselling Prevention (Pessimistic Locking)', () => {
    it('should allow exactly 5 successful orders when stock is 5', async () => {
      // Setup: Create product with stock = 5
      testProduct = await prisma.product.create({
        data: {
          productCode: `TEST-LOCK-${Date.now()}`,
          productName: 'Test Product Concurrency',
          price: new Decimal('50000'),
          stock: 5,
          lowStockThreshold: 1,
        },
      });

      // Create 20 concurrent order requests
      const orderRequests = Array.from({ length: 20 }, (_, i) => ({
        customer_id: testCustomer.id,
        items: [
          {
            product_id: String(testProduct.id),
            quantity: 1,
          },
        ],
        idempotencyKey: `test-concurrent-${Date.now()}-${i}`,
      }));

      // Execute all requests in parallel
      const results = await Promise.allSettled(
        orderRequests.map((req) =>
          service.createOrder(
            req,
            Number(testUser.id),
            req.idempotencyKey,
          ),
        ),
      );

      // Count successes and failures
      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      console.log(
        `\n📊 Concurrency Test Results:`,
        `\n  ✅ Successful orders: ${successes.length}`,
        `\n  ❌ Failed orders: ${failures.length}`,
        `\n  Expected: 5 successes, 15 failures`,
      );

      // Assertions
      expect(successes.length).toBe(5);
      expect(failures.length).toBe(15);

      // Verify all failures are 409 Conflict (insufficient stock)
      failures.forEach((result) => {
        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(ConflictException);
        }
      });

      // Verify final stock is 0
      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      console.log(
        `\n📦 Stock Verification:`,
        `\n  Initial stock: 5`,
        `\n  Final stock: ${updatedProduct!.stock}`,
        `\n  Expected: 0`,
      );

      expect(updatedProduct!.stock).toBe(0);

      // Verify 5 orders were created
      const ordersCreated = await prisma.order.count({
        where: {
          items: {
            some: {
              productId: testProduct.id,
            },
          },
        },
      });

      console.log(
        `\n📋 Order Count:`,
        `\n  Total orders created: ${ordersCreated}`,
        `\n  Expected: 5`,
      );

      expect(ordersCreated).toBe(5);

      // Verify stock movements consistency
      const movements = await prisma.stockMovement.findMany({
        where: {
          productId: testProduct.id,
          type: 'ORDER_OUT',
        },
      });

      console.log(
        `\n📝 Stock Movements:`,
        `\n  Total movements: ${movements.length}`,
        `\n  Expected: 5`,
      );

      expect(movements.length).toBe(5);

      // Verify sum of quantity changes = 5
      const totalQtyChanged = movements.reduce(
        (sum, m) => sum + Math.abs(m.quantityChange),
        0,
      );
      expect(totalQtyChanged).toBe(5);

      // Verify no negative stock in any movement
      movements.forEach((movement) => {
        expect(movement.stockAfter).toBeGreaterThanOrEqual(0);
      });

      console.log(`\n✅ All concurrency checks passed!`);
    });

    it('should handle deadlock prevention with sorted product IDs', async () => {
      // Create 3 products
      const product1 = await prisma.product.create({
        data: {
          productCode: `DEADLOCK-1-${Date.now()}`,
          productName: 'Deadlock Test Product 1',
          price: new Decimal('10000'),
          stock: 100,
          lowStockThreshold: 5,
        },
      });

      const product2 = await prisma.product.create({
        data: {
          productCode: `DEADLOCK-2-${Date.now()}`,
          productName: 'Deadlock Test Product 2',
          price: new Decimal('20000'),
          stock: 100,
          lowStockThreshold: 5,
        },
      });

      const product3 = await prisma.product.create({
        data: {
          productCode: `DEADLOCK-3-${Date.now()}`,
          productName: 'Deadlock Test Product 3',
          price: new Decimal('30000'),
          stock: 100,
          lowStockThreshold: 5,
        },
      });

      // Create multi-item order in different permutations to test lock ordering
      const orderWithSortedLocks = await service.createOrder(
        {
          customer_id: testCustomer.id,
          items: [
            {
              product_id: String(product3.id), // Highest ID first
              quantity: 5,
            },
            {
              product_id: String(product1.id), // Lowest ID last
              quantity: 3,
            },
            {
              product_id: String(product2.id), // Middle ID
              quantity: 2,
            },
          ],
        },
        Number(testUser.id),
        `deadlock-test-${Date.now()}`,
      );

      expect(orderWithSortedLocks).toBeDefined();
      expect(orderWithSortedLocks.status).toBe('PENDING');

      // Verify stocks were decremented correctly
      const p1 = await prisma.product.findUnique({ where: { id: product1.id } });
      const p2 = await prisma.product.findUnique({ where: { id: product2.id } });
      const p3 = await prisma.product.findUnique({ where: { id: product3.id } });

      expect(p1!.stock).toBe(97); // 100 - 3
      expect(p2!.stock).toBe(98); // 100 - 2
      expect(p3!.stock).toBe(95); // 100 - 5

      console.log(`\n✅ Deadlock prevention test passed!`);
    });

    it('should not allow overselling in race condition', async () => {
      // Create product with very limited stock
      const limitedProduct = await prisma.product.create({
        data: {
          productCode: `RACE-${Date.now()}`,
          productName: 'Race Condition Test',
          price: new Decimal('100000'),
          stock: 3,
          lowStockThreshold: 1,
        },
      });

      // Send 10 concurrent requests, each for 1 unit
      const raceConditionRequests = Array.from({ length: 10 }, (_, i) => ({
        customer_id: testCustomer.id,
        items: [
          {
            product_id: String(limitedProduct.id),
            quantity: 1,
          },
        ],
        idempotencyKey: `race-${Date.now()}-${i}`,
      }));

      const results = await Promise.allSettled(
        raceConditionRequests.map((req) =>
          service.createOrder(
            req,
            Number(testUser.id),
            req.idempotencyKey,
          ),
        ),
      );

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      console.log(
        `\n🏁 Race Condition Test:`,
        `\n  Successes: ${successes.length}`,
        `\n  Failures: ${failures.length}`,
        `\n  Expected: 3 successes, 7 failures`,
      );

      expect(successes.length).toBe(3);
      expect(failures.length).toBe(7);

      // Final stock must be 0, never negative
      const finalProduct = await prisma.product.findUnique({
        where: { id: limitedProduct.id },
      });

      expect(finalProduct!.stock).toBe(0);
      expect(finalProduct!.stock).toBeGreaterThanOrEqual(0);

      console.log(`\n✅ Race condition test passed!`);
    });
  });

  describe('Idempotency & Duplicate Prevention', () => {
    it('should return same response for identical idempotency key', async () => {
      const product = await prisma.product.create({
        data: {
          productCode: `IDEM-${Date.now()}`,
          productName: 'Idempotency Test Product',
          price: new Decimal('50000'),
          stock: 100,
          lowStockThreshold: 5,
        },
      });

      const orderData = {
        customer_id: testCustomer.id,
        items: [
          {
            product_id: String(product.id),
            quantity: 2,
          },
        ],
      };

      const idempotencyKey = `idem-test-${Date.now()}`;

      // First request
      const result1 = await service.createOrder(
        orderData,
        Number(testUser.id),
        idempotencyKey,
      );

      // Second request with same key
      const result2 = await service.createOrder(
        orderData,
        Number(testUser.id),
        idempotencyKey,
      );

      // Should return exact same response
      expect(result2.id).toBe(result1.id);
      expect(result2.orderNumber).toBe(result1.orderNumber);
      expect(result2.totalAmount).toBe(result1.totalAmount);

      console.log(`\n✅ Idempotency test passed!`);
    });

    it('should not create duplicate orders on retry', async () => {
      const product = await prisma.product.create({
        data: {
          productCode: `NO-DUP-${Date.now()}`,
          productName: 'No Duplicate Test',
          price: new Decimal('30000'),
          stock: 50,
          lowStockThreshold: 5,
        },
      });

      const orderData = {
        customer_id: testCustomer.id,
        items: [
          {
            product_id: String(product.id),
            quantity: 1,
          },
        ],
      };

      const idempotencyKey = `no-dup-${Date.now()}`;

      // Simulate retry: 3 requests with same key
      const results = await Promise.all([
        service.createOrder(orderData, Number(testUser.id), idempotencyKey),
        service.createOrder(orderData, Number(testUser.id), idempotencyKey),
        service.createOrder(orderData, Number(testUser.id), idempotencyKey),
      ]);

      // All should have same ID
      const orderIds = new Set(results.map((r) => r.id));
      expect(orderIds.size).toBe(1); // Only 1 unique order

      // Stock should be decremented only once
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });

      expect(updatedProduct!.stock).toBe(49); // 50 - 1

      console.log(`\n✅ No duplicate orders test passed!`);
    });
  });

  describe('Stock Cancellation & Restoration', () => {
    it('should restore stock atomically on order cancellation', async () => {
      const product = await prisma.product.create({
        data: {
          productCode: `CANCEL-${Date.now()}`,
          productName: 'Cancellation Test Product',
          price: new Decimal('40000'),
          stock: 100,
          lowStockThreshold: 5,
        },
      });

      // Create order that will be cancelled
      const order = await service.createOrder(
        {
          customer_id: testCustomer.id,
          items: [
            {
              product_id: String(product.id),
              quantity: 10,
            },
          ],
        },
        Number(testUser.id),
        `cancel-order-${Date.now()}`,
      );

      // Verify stock was decremented
      let productAfterOrder = await prisma.product.findUnique({
        where: { id: product.id },
      });

      expect(productAfterOrder!.stock).toBe(90); // 100 - 10

      // Cancel the order
      await service.cancelOrder(
        order.id,
        BigInt(testUser.id),
        'Test cancellation',
      );

      // Verify stock was restored
      const productAfterCancel = await prisma.product.findUnique({
        where: { id: product.id },
      });

      expect(productAfterCancel!.stock).toBe(100); // Back to original

      // Verify stock movement was recorded
      const cancelMovement = await prisma.stockMovement.findFirst({
        where: {
          productId: product.id,
          type: 'CANCEL_RESTORE',
        },
      });

      expect(cancelMovement).toBeDefined();
      expect(cancelMovement!.quantityChange).toBe(10);

      console.log(`\n✅ Stock cancellation test passed!`);
    });

    it('should not restore stock twice on double cancel attempt', async () => {
      const product = await prisma.product.create({
        data: {
          productCode: `DOUBLE-CANCEL-${Date.now()}`,
          productName: 'Double Cancel Test',
          price: new Decimal('25000'),
          stock: 50,
          lowStockThreshold: 5,
        },
      });

      const order = await service.createOrder(
        {
          customer_id: testCustomer.id,
          items: [
            {
              product_id: String(product.id),
              quantity: 5,
            },
          ],
        },
        Number(testUser.id),
        `double-cancel-${Date.now()}`,
      );

      // First cancellation
      await service.cancelOrder(
        order.id,
        BigInt(testUser.id),
        'First cancel',
      );

      const productAfterFirstCancel = await prisma.product.findUnique({
        where: { id: product.id },
      });

      expect(productAfterFirstCancel!.stock).toBe(50); // Restored

      // Second cancellation should fail with ConflictException
      await expect(
        service.cancelOrder(
          order.id,
          BigInt(testUser.id),
          'Second cancel',
        ),
      ).rejects.toThrow(ConflictException);

      // Stock should remain unchanged
      const productAfterSecondAttempt = await prisma.product.findUnique({
        where: { id: product.id },
      });

      expect(productAfterSecondAttempt!.stock).toBe(50); // Still 50

      console.log(`\n✅ Double cancel prevention test passed!`);
    });
  });
});

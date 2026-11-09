import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data - delete in order of FK dependencies
  await prisma.auditLog.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@azatech.id',
      password: '$2b$10$4V0wal0d3TpOCtxjQqgdLe7z/hv/8LKh2RipiBh/xH7SAvrJJqYAG', // bcrypt hash of "password123"
      role: 'ADMIN',
    },
  });

  const cashierUser = await prisma.user.create({
    data: {
      name: 'Cashier User',
      email: 'cashier@azatech.id',
      password: '$2b$10$4V0wal0d3TpOCtxjQqgdLe7z/hv/8LKh2RipiBh/xH7SAvrJJqYAG', // bcrypt hash of "password123"
      role: 'CASHIER',
    },
  });

  console.log('✅ Created users');

  // Create 50 products per spec
  const products: any[] = [];
  
  const productConfigs = [
    { name: 'Coffee Arabica Premium', price: 85000 },
    { name: 'Coffee Robusta Blend', price: 65000 },
    { name: 'Tea Green Jasmine', price: 45000 },
    { name: 'Chocolate Dark 70%', price: 55000 },
    { name: 'Cookies Butter Almond', price: 35000 },
  ];

  for (let i = 1; i <= 50; i++) {
    const config = i <= 5 ? productConfigs[i - 1] : productConfigs[Math.floor(Math.random() * 5)];
    const product = await prisma.product.create({
      data: {
        productCode: `PROD-${String(i).padStart(3, '0')}`,
        productName: i <= 5 ? config.name : `${config.name} Variant ${i - 5}`,
        price: new Decimal(config.price + Math.random() * 10000),
        stock: Math.floor(Math.random() * 300) + 50,
        lowStockThreshold: Math.floor(Math.random() * 30) + 5,
      },
    });
    products.push(product);
  }

  console.log(`✅ Created ${products.length} products`);

  // Create 30 customers per spec
  const customers: any[] = [];
  
  const customerNames = [
    'John Doe',
    'Jane Smith',
    'PT Maju Jaya',
    'Toko Abadi',
    'Warung Mak Siti',
    'Cafe Berkah',
    'Restoran Tradisi',
    'Toko Kelontong Jaya',
    'Warung Nusantara',
    'Mini Market Sejahtera',
  ];

  for (let i = 1; i <= 30; i++) {
    const baseName = customerNames[Math.floor(Math.random() * customerNames.length)];
    const customer = await prisma.customer.create({
      data: {
        customerName: i <= 10 ? baseName : `${baseName} ${i}`,
        email: `customer${i}@example.com`,
        phone: `+6281${String(i).padStart(8, '0')}`,
        customerAddress: `Jl. Merdeka No. ${i * 10}, Jakarta`,
        gender: i % 2 === 0 ? 'Wanita' : 'Pria',
        birthDate: new Date(`${1980 + (i % 40)}-${(i % 12) + 1}-${(i % 28) + 1}`),
      },
    });
    customers.push(customer);
  }

  console.log(`✅ Created ${customers.length} customers`);

  // Create 150+ orders over 90 days per spec
  const baseDate = new Date();
  const orders: any[] = [];
  let orderCounter = 1;

  for (let dayOffset = 90; dayOffset > 0; dayOffset--) {
    // Generate 1-2 orders per day (total ~120-150 orders)
    const ordersPerDay = dayOffset % 5 === 0 ? 2 : 1;

    for (let ord = 0; ord < ordersPerDay; ord++) {
      const orderDate = new Date(baseDate);
      orderDate.setDate(baseDate.getDate() - dayOffset);
      orderDate.setHours(Math.floor(Math.random() * 24));
      orderDate.setMinutes(Math.floor(Math.random() * 60));

      // Prioritize statuses for reports (50% PAID, 25% SHIPPED, 25% COMPLETED)
      const statusWeights = [
        'PAID',
        'PAID',
        'PAID',
        'PAID',
        'SHIPPED',
        'SHIPPED',
        'COMPLETED',
        'COMPLETED',
      ];
      const status = statusWeights[
        Math.floor(Math.random() * statusWeights.length)
      ] as any;

      const customer = customers[Math.floor(Math.random() * customers.length)];
      const itemCount = Math.floor(Math.random() * 4) + 1; // 1-4 items per order

      let totalAmount = new Decimal(0);
      const selectedProducts: Array<{ id: bigint; price: Decimal }> = [];

      // Select 1-4 random products
      for (let j = 0; j < itemCount; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 10) + 1;
        totalAmount = totalAmount.add(new Decimal(product.price).mul(qty));

        if (!selectedProducts.find((p) => p.id === product.id)) {
          selectedProducts.push(product);
        }
      }

      // Set timestamps based on status
      const paidAt =
        status !== 'PENDING'
          ? new Date(orderDate.getTime() + 3600000)
          : undefined; // +1 hour
      const shippedAt =
        status === 'SHIPPED' || status === 'COMPLETED'
          ? new Date(orderDate.getTime() + 7200000)
          : undefined; // +2 hours
      const completedAt =
        status === 'COMPLETED'
          ? new Date(orderDate.getTime() + 86400000)
          : undefined; // +1 day

      const orderNumber = `ORD-${orderDate
        .toISOString()
        .split('T')[0]
        .replace(/-/g, '')}-${String(orderCounter).padStart(5, '0')}`;

      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          createdBy: adminUser.id,
          totalAmount,
          status,
          orderDate,
          paidAt,
          shippedAt,
          completedAt,
          createdAt: orderDate,
          updatedAt: orderDate,
        },
      });

      // Create order items
      for (const product of selectedProducts) {
        const qty = Math.floor(Math.random() * 10) + 1;
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            quantity: qty,
            unitPrice: product.price,
            subtotal: product.price.mul(qty),
          },
        });
      }

      // Create status history
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'PENDING',
          createdAt: orderDate,
        },
      });

      if (status !== 'PENDING') {
        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: status as any,
            createdAt: paidAt || new Date(),
          },
        });
      }

      if (status === 'SHIPPED' || status === 'COMPLETED') {
        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: 'SHIPPED',
            createdAt: shippedAt || new Date(),
          },
        });
      }

      if (status === 'COMPLETED') {
        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: 'COMPLETED',
            createdAt: completedAt || new Date(),
          },
        });
      }

      orders.push(order);
      orderCounter++;
    }
  }

  console.log(`✅ Created ${orders.length} orders over 90 days`);

  // Create audit logs
  const auditLogs = [
    {
      userId: adminUser.id,
      action: 'LOGIN',
      entityType: 'Auth',
      entityId: '',
      metadata: JSON.stringify({
        description: 'Admin logged in',
        timestamp: new Date().toISOString(),
      }),
    },
    {
      userId: adminUser.id,
      action: 'READ_LIST',
      entityType: 'Product',
      entityId: '',
      metadata: JSON.stringify({
        description: 'Viewed all products',
        timestamp: new Date().toISOString(),
      }),
    },
    {
      userId: cashierUser.id,
      action: 'LOGIN',
      entityType: 'Auth',
      entityId: '',
      metadata: JSON.stringify({
        description: 'Cashier logged in',
        timestamp: new Date().toISOString(),
      }),
    },
    {
      userId: cashierUser.id,
      action: 'CREATE',
      entityType: 'Order',
      entityId: String(orders[0].id),
      metadata: JSON.stringify({
        description: `Created order ${orders[0].orderNumber}`,
        timestamp: new Date().toISOString(),
      }),
    },
    {
      userId: cashierUser.id,
      action: 'ORDER_PAID',
      entityType: 'Order',
      entityId: String(orders[0].id),
      metadata: JSON.stringify({
        description: `Marked order ${orders[0].orderNumber} as paid`,
        timestamp: new Date().toISOString(),
      }),
    },
    {
      userId: adminUser.id,
      action: 'QUERY',
      entityType: 'Reports',
      entityId: '',
      metadata: JSON.stringify({
        description: 'Viewed sales report',
        timestamp: new Date().toISOString(),
      }),
    },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: log });
  }

  console.log('✅ Created audit logs');

  // Summary
  console.log('');
  console.log('📊 SEED DATA SUMMARY:');
  console.log(`  - Users: 2 (1 admin, 1 cashier)`);
  console.log(`  - Products: ${products.length}`);
  console.log(`  - Customers: ${customers.length}`);
  console.log(`  - Orders: ${orders.length}`);
  console.log(`  - Audit Logs: ${auditLogs.length}`);
  console.log('');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

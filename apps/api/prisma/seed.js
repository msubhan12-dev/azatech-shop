"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const prisma = new client_1.PrismaClient();
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
            email: 'admin@example.com',
            password: '$2b$10$...', // bcrypt hash of "password123"
            role: 'ADMIN',
        },
    });
    const cashierUser = await prisma.user.create({
        data: {
            name: 'Cashier User',
            email: 'cashier@example.com',
            password: '$2b$10$...', // bcrypt hash of "password123"
            role: 'CASHIER',
        },
    });
    console.log('✅ Created users');
    // Create products
    const products = await Promise.all([
        prisma.product.create({
            data: {
                productCode: 'PROD-001',
                productName: 'Coffee Arabica Premium',
                price: 85000,
                stock: 150,
                lowStockThreshold: 20,
            },
        }),
        prisma.product.create({
            data: {
                productCode: 'PROD-002',
                productName: 'Coffee Robusta Blend',
                price: 65000,
                stock: 200,
                lowStockThreshold: 30,
            },
        }),
        prisma.product.create({
            data: {
                productCode: 'PROD-003',
                productName: 'Tea Green Jasmine',
                price: 45000,
                stock: 120,
                lowStockThreshold: 25,
            },
        }),
        prisma.product.create({
            data: {
                productCode: 'PROD-004',
                productName: 'Chocolate Dark 70%',
                price: 55000,
                stock: 80,
                lowStockThreshold: 15,
            },
        }),
        prisma.product.create({
            data: {
                productCode: 'PROD-005',
                productName: 'Cookies Butter Almond',
                price: 35000,
                stock: 5,
                lowStockThreshold: 20,
            },
        }),
    ]);
    console.log('✅ Created 5 products');
    // Create customers
    const customers = await Promise.all([
        prisma.customer.create({
            data: {
                customerName: 'John Doe',
                email: 'john@example.com',
                phone: '+62812345678',
                customerAddress: 'Jl. Sudirman No. 123, Jakarta',
                gender: 'Pria',
                birthDate: new Date('1990-05-15'),
            },
        }),
        prisma.customer.create({
            data: {
                customerName: 'Jane Smith',
                email: 'jane@example.com',
                phone: '+62812345679',
                customerAddress: 'Jl. Gatot Subroto No. 456, Bandung',
                gender: 'Wanita',
                birthDate: new Date('1992-08-20'),
            },
        }),
        prisma.customer.create({
            data: {
                customerName: 'PT Maju Jaya',
                email: 'contact@majujaya.com',
                phone: '+62213456789',
                customerAddress: 'Gedung Graha No. 789, Surabaya',
                gender: 'Pria',
            },
        }),
    ]);
    console.log('✅ Created 3 customers');
    // Create orders with various dates and statuses (past 30 days)
    const baseDate = new Date();
    const orders = [];
    for (let i = 30; i > 0; i--) {
        const orderDate = new Date(baseDate);
        orderDate.setDate(baseDate.getDate() - i);
        // Random order data
        const statuses = ['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const itemCount = Math.floor(Math.random() * 3) + 1;
        let totalAmount = 0;
        const selectedProducts = [];
        for (let j = 0; j < itemCount; j++) {
            const product = products[Math.floor(Math.random() * products.length)];
            if (!selectedProducts.includes(Number(product.id))) {
                selectedProducts.push(Number(product.id));
            }
        }
        // Calculate total
        for (const productId of selectedProducts) {
            const product = products.find((p) => Number(p.id) === productId);
            const qty = Math.floor(Math.random() * 5) + 1;
            totalAmount += Number(product.price) * qty;
        }
        const order = await prisma.order.create({
            data: {
                orderNumber: `ORD-${String(i).padStart(4, '0')}`,
                customerId: String(customer.id),
                createdBy: Number(adminUser.id),
                totalAmount: new library_1.Decimal(totalAmount),
                status: status,
                orderDate,
            },
        });
        // Create order items separately
        for (const productId of selectedProducts) {
            const product = products.find((p) => Number(p.id) === productId);
            const qty = Math.floor(Math.random() * 5) + 1;
            await prisma.orderItem.create({
                data: {
                    orderId: order.id,
                    productId: String(productId),
                    quantity: qty,
                    unitPrice: new library_1.Decimal(Number(product.price)),
                    subtotal: new library_1.Decimal(Number(product.price) * qty),
                },
            });
        }
        orders.push(order);
    }
    console.log('✅ Created 30 orders across past 30 days');
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
    console.log('🎉 Seed completed!');
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map
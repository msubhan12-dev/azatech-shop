import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { Decimal } from '@prisma/client/runtime/library';

function serializeBigInt(obj: any): any {
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === 'bigint') return Number(obj);
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Decimal) return obj.toNumber?.() || Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[key] = serializeBigInt(value);
    return acc;
  }, {} as any);
}

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getSalesReport(from: Date, to: Date, groupBy: 'day' | 'month' = 'day') {
    const cacheKey = `sales_report:${from.toISOString()}:${to.toISOString()}:${groupBy}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const orders = await this.prisma.order.findMany({
      where: {
        orderDate: { gte: from, lte: to },
        status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] },
      },
      select: { id: true, orderDate: true, totalAmount: true },
    });

    const grouped: Record<string, any> = {};
    orders.forEach((order) => {
      const dateKey = groupBy === 'day'
        ? order.orderDate.toISOString().split('T')[0]
        : order.orderDate.toISOString().slice(0, 7);

      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, order_count: 0, total_sales: 0 };
      }
      grouped[dateKey].order_count += 1;
      grouped[dateKey].total_sales += Number(order.totalAmount);
    });

    const result = Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
    await this.redis.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  async getTopProducts(from: Date, to: Date, limit = 10) {
    const cacheKey = `top_products:${from.toISOString()}:${to.toISOString()}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          orderDate: { gte: from, lte: to },
          status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] },
        },
      },
      include: { product: true },
    });

    const productMap: Record<number, any> = {};
    items.forEach((item) => {
      const pid = Number(item.productId);
      if (!productMap[pid]) {
        productMap[pid] = {
          id: pid,
          productCode: item.product.productCode,
          productName: item.product.productName,
          quantity_sold: 0,
          total_revenue: 0,
        };
      }
      productMap[pid].quantity_sold += item.quantity;
      productMap[pid].total_revenue += Number(item.subtotal);
    });

    const result = Object.values(productMap)
      .sort((a: any, b: any) => b.total_revenue - a.total_revenue)
      .slice(0, limit);

    await this.redis.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  async getDashboardSummary() {
    const cacheKey = 'dashboard_summary';
    const cached = await this.redis.get(cacheKey);
    if (cached) return serializeBigInt(JSON.parse(cached));

    // Count orders by ALL statuses
    const [
      pending,
      paid,
      shipped,
      completed,
      cancelled,
      totalCustomers,
      totalProducts,
      lowStockProducts,
    ] = await Promise.all([
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'PAID' } }),
      this.prisma.order.count({ where: { status: 'SHIPPED' } }),
      this.prisma.order.count({ where: { status: 'COMPLETED' } }),
      this.prisma.order.count({ where: { status: 'CANCELLED' } }),
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.product.count({
        where: {
          stock: { lt: 5 },
          deletedAt: null,
        },
      }),
    ]);

    // Get total revenue from PAID, SHIPPED, COMPLETED orders
    const revenueResult = await this.prisma.order.aggregate({
      where: { status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] } },
      _sum: { totalAmount: true },
    });

    const totalRevenue = revenueResult._sum?.totalAmount
      ? Number(revenueResult._sum.totalAmount)
      : 0;

    // Get recent orders
    const recentOrders = await this.prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: true, items: true },
    });

    // Get top customer by order count
    const topCustomer = await this.prisma.$queryRaw<
      Array<{ customer_id: string; customer_name: string; order_count: number }>
    >`
      SELECT c.id as customer_id, c."customerName" as customer_name, COUNT(o.id) as order_count
      FROM customers c
      LEFT JOIN orders o ON c.id = o."customerId"
      WHERE c."deletedAt" IS NULL
      GROUP BY c.id, c."customerName"
      ORDER BY order_count DESC
      LIMIT 1
    `;

    // Get recently added products
    const recentlyAddedProducts = await this.prisma.product.findMany({
      take: 5,
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    // Get recent audit activities
    const recentActivities = await this.prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });

    const result = {
      order_statistics: {
        pending_orders: pending,
        paid_orders: paid,
        shipped_orders: shipped,
        completed_orders: completed,
        cancelled_orders: cancelled,
      },
      revenue_metrics: {
        total_revenue: totalRevenue,
        order_count: paid + shipped + completed,
      },
      inventory_metrics: {
        total_products: totalProducts,
        low_stock_products: lowStockProducts,
      },
      customer_metrics: {
        total_customers: totalCustomers,
        top_customer: topCustomer[0] || null,
      },
      recent_orders: recentOrders.map((o) => ({
        id: Number(o.id),
        order_number: o.orderNumber,
        customer_name: o.customer?.customerName,
        total_amount: Number(o.totalAmount),
        status: o.status,
        created_at: o.createdAt.toISOString(),
      })),
      recently_added_products: recentlyAddedProducts.map((p) => ({
        id: Number(p.id),
        product_code: p.productCode,
        product_name: p.productName,
        stock: p.stock,
        created_at: p.createdAt.toISOString(),
      })),
      recent_activities: recentActivities.map((a) => ({
        id: Number(a.id),
        action: a.action,
        entity_type: a.entityType,
        user_name: a.user?.name,
        created_at: a.createdAt.toISOString(),
      })),
    };

    // Cache for 5 minutes
    try {
      await this.redis.set(cacheKey, JSON.stringify(serializeBigInt(result)), 300);
    } catch (err) {
      // Cache errors should not break the response
    }
    return serializeBigInt(result);
  }

  /**
   * Invalidate dashboard cache
   * Called when order status changes or product stock is adjusted
   */
  async invalidateDashboardCache() {
    await this.redis.del('dashboard_summary');
  }

  /**
   * Invalidate sales report cache
   * Called when order is created or status changed
   */
  async invalidateSalesReportCache() {
    const client = this.redis.getClient();
    if (!client?.isOpen) return;

    // Delete all sales_report:* keys
    const keys = await client.keys('sales_report:*');
    if (keys && keys.length > 0) {
      await client.del(keys);
    }
  }

  /**
   * Invalidate top products cache
   */
  async invalidateTopProductsCache() {
    const client = this.redis.getClient();
    if (!client?.isOpen) return;

    // Delete all top_products:* keys
    const keys = await client.keys('top_products:*');
    if (keys && keys.length > 0) {
      await client.del(keys);
    }
  }
}

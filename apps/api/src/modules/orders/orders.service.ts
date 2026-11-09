import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { CreateOrderDto } from './dto/create-order.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderStateMachine } from './order-state.machine';
import { ReportsService } from '../reports/reports.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function convertToSnakeCase(obj: any): any {
  if (typeof obj === 'bigint') return Number(obj);
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Decimal) return obj.toNumber?.() || Number(obj);
  if (Array.isArray(obj)) return obj.map(convertToSnakeCase);
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const snakeKey = camelToSnake(key);
    acc[snakeKey] = convertToSnakeCase(value);
    return acc;
  }, {} as any);
}

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
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private reportsService: ReportsService,
    @InjectQueue('invoice') private invoiceQueue: Queue,
    @InjectQueue('notifications') private notificationQueue: Queue,
  ) {}

  async getInvoice(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: { include: { product: true } },
        statusHistories: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const subtotal = order.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td>${item.product?.productName || '-'}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">Rp${Number(item.unitPrice).toLocaleString('id-ID')}</td>
          <td style="text-align:right">Rp${Number(item.subtotal).toLocaleString('id-ID')}</td>
        </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><title>Invoice ${order.orderNumber}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #333; }
  h1 { color: #1a56db; } table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { padding: 10px; border: 1px solid #ddd; } th { background: #f5f5f5; }
  .total { font-size: 1.2em; font-weight: bold; color: #1a56db; }
  .status { display: inline-block; padding: 4px 12px; background: #d1fae5; color: #065f46; border-radius: 999px; }
</style>
</head>
<body>
  <h1>INVOICE</h1>
  <table>
    <tr><td><strong>No. Order</strong></td><td>${order.orderNumber}</td></tr>
    <tr><td><strong>Tanggal</strong></td><td>${new Date(order.orderDate).toLocaleDateString('id-ID')}</td></tr>
    <tr><td><strong>Customer</strong></td><td>${order.customer?.customerName || '-'}</td></tr>
    <tr><td><strong>Status</strong></td><td><span class="status">${order.status}</span></td></tr>
  </table>
  <table>
    <thead><tr><th>Produk</th><th>Qty</th><th>Harga Satuan</th><th>Subtotal</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
    <tfoot>
      <tr><td colspan="3" style="text-align:right">Subtotal</td><td style="text-align:right">Rp${subtotal.toLocaleString('id-ID')}</td></tr>
      <tr><td colspan="3" style="text-align:right">PPN 10%</td><td style="text-align:right">Rp${tax.toLocaleString('id-ID')}</td></tr>
      <tr class="total"><td colspan="3" style="text-align:right">Total</td><td style="text-align:right">Rp${total.toLocaleString('id-ID')}</td></tr>
    </tfoot>
  </table>
</body></html>`;

    return { html, order_number: order.orderNumber };
  }

  /**
   * Validate invoice tax calculation to prevent fraud
   * Server-side validation prevents client-side tax manipulation
   */
  async validateInvoiceTax(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Calculate subtotal from items
    const subtotal = order.items.reduce((sum, item) => {
      return sum + Number(item.subtotal);
    }, 0);

    // Tax rate (example: 10%)
    const taxRate = 0.1;
    const calculatedTax = Math.round(subtotal * taxRate);
    const calculatedTotal = subtotal + calculatedTax;

    // Submitted total from order
    const submittedTotal = Number(order.totalAmount);
    const submittedTax = submittedTotal - subtotal;

    // Validation
    const isCorrect = calculatedTotal === submittedTotal && calculatedTax === submittedTax;

    return {
      valid: isCorrect,
      message: isCorrect
        ? 'Invoice calculation is correct'
        : 'Invoice calculation contains discrepancies',
      details: {
        subtotal,
        tax_rate: taxRate,
        calculated_tax: calculatedTax,
        submitted_tax: submittedTax,
        calculated_total: calculatedTotal,
        submitted_total: submittedTotal,
        is_correct: isCorrect,
      },
    };
  }

  /**
   * Helper method to ensure cache invalidation before response
   * Invalidates all related caches atomically
   */
  private async invalidateOrderCaches(): Promise<void> {
    await Promise.all([
      this.reportsService.invalidateDashboardCache(),
      this.reportsService.invalidateSalesReportCache(),
      this.reportsService.invalidateTopProductsCache(),
    ]);
  }

  async createOrder(
  dto: CreateOrderDto,
  userId: number,
  idempotencyKey: string,
) {
  // Check idempotency
  const existing = await this.prisma.idempotencyKey.findUnique({
    where: { key: idempotencyKey },
  });

  if (existing) {
    if (existing.status === 202) {
      throw new ConflictException('Request is still processing');
    }

    return existing.response ? JSON.parse(existing.response) : null;
  }

  // Create idempotency key record
  await this.prisma.idempotencyKey.create({
    data: {
      key: idempotencyKey,
      method: 'POST',
      path: '/api/orders',
      status: 202,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  try {
    // Validate customer
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customer_id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Aggregate duplicate product IDs
    const requestedItems = new Map<bigint, number>();

    for (const item of dto.items) {
      const productId = BigInt(item.product_id);

      requestedItems.set(
        productId,
        (requestedItems.get(productId) || 0) + item.quantity,
      );
    }

    // Generate unique order number
    const orderNumber = `INV-${new Date()
      .toISOString()
      .split('T')[0]
      .replace(/-/g, '')}-${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;

    // Create order inside transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const lockedProducts = new Map<
        bigint,
        Awaited<ReturnType<typeof tx.product.findUnique>>
      >();

      // Sort product IDs to maintain consistent lock ordering
      const sortedProductIds = [...requestedItems.keys()].sort(
        (a, b) => (a < b ? -1 : a > b ? 1 : 0),
      );

      // Lock product rows using PostgreSQL FOR UPDATE
      for (const productId of sortedProductIds) {
        await tx.$queryRaw<Array<{ id: bigint }>>`
          SELECT "id"
          FROM "products"
          WHERE "id" = ${productId}
          FOR UPDATE
        `;

        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Product ${productId} not found`,
          );
        }

        lockedProducts.set(productId, product);
      }

      // Validate stock and calculate total
      let totalAmount = new Decimal(0);

      const itemsWithDetails = dto.items.map((item) => {
        const productId = BigInt(item.product_id);
        const product = lockedProducts.get(productId);

        if (!product) {
          throw new NotFoundException(
            `Product ${item.product_id} not found`,
          );
        }

        const unitPrice = new Decimal(product.price.toString());
        const subtotal = unitPrice.mul(item.quantity);

        totalAmount = totalAmount.add(subtotal);

        return {
          productId,
          quantity: item.quantity,
          unitPrice,
          subtotal,
        };
      });

      // Validate aggregated stock
      for (const [productId, requestedQuantity] of requestedItems) {
        const product = lockedProducts.get(productId);

        if (!product) {
          throw new NotFoundException(
            `Product ${productId} not found`,
          );
        }

        if (product.stock < requestedQuantity) {
          throw new ConflictException(
            `Insufficient stock for product ${productId}. Available: ${product.stock}, Requested: ${requestedQuantity}`,
          );
        }
      }

      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: dto.customer_id,
          createdBy: userId,
          status: 'PENDING',
          totalAmount,
          items: {
            create: itemsWithDetails.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      // Update stock and record movements
      for (const [productId, requestedQuantity] of requestedItems) {
        const updated = await tx.product.update({
          where: { id: productId },
          data: {
            stock: {
              decrement: requestedQuantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId,
            type: 'ORDER_OUT',
            quantityChange: -requestedQuantity,
            stockAfter: updated.stock,
            referenceType: 'order',
            referenceId: order.id.toString(),
            createdBy: userId,
          },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          action: 'CREATE_ORDER',
          entityType: 'order',
          entityId: order.id.toString(),
          userId,
          newValues: JSON.stringify(serializeBigInt(order)),
        },
      });

      return serializeBigInt(order);
    });

    // Update idempotency key
    await this.prisma.idempotencyKey.update({
      where: { key: idempotencyKey },
      data: {
        status: 201,
        response: JSON.stringify(serializeBigInt(result)),
      },
    });

    // Invalidate caches for new order
    await this.invalidateOrderCaches();

    return convertToSnakeCase(serializeBigInt(result));
  } catch (error) {
    // Update idempotency key with error
    await this.prisma.idempotencyKey.update({
      where: { key: idempotencyKey },
      data: { status: 409 },
    });

    throw error;
  }
}

  async getOrders(
    page = 1,
    limit = 10,
    status?: string,
    customerId?: string,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: true } },
        statusHistories: {
          orderBy: { createdAt: 'desc' },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.order.count({ where });

    return {
      data: convertToSnakeCase(serializeBigInt(orders)),
      meta: {
        page,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } },
        statusHistories: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return convertToSnakeCase(serializeBigInt(order));
  }

  async payOrder(id: number, userId: number, userRole: string = 'CASHIER') {
    const order = await this.getOrderById(id);

    OrderStateMachine.validateTransition(order.status, 'PAID' as any, userRole as any);

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        statusHistories: {
          create: {
            status: 'PAID',
          },
        },
      },
      include: { items: { include: { product: true } }, customer: true },
    });

    // Queue invoice job
    await this.invoiceQueue.add({
      orderId: id,
      orderNumber: order.order_number,
      customerId: order.customer_id,
      customerEmail: order.customer?.email,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'ORDER_PAID',
        entityType: 'order',
        entityId: id.toString(),
        userId,
        newValues: JSON.stringify(serializeBigInt({ status: 'PAID' })),
      },
    });

    // Invalidate caches before returning response
    await this.invalidateOrderCaches();

    return convertToSnakeCase(serializeBigInt(updated));
  }

  async shipOrder(id: number, userId: number) {
    const order = await this.getOrderById(id);
    OrderStateMachine.validateTransition(order.status, 'SHIPPED', 'ADMIN');

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: 'SHIPPED',
        shippedAt: new Date(),
        statusHistories: {
          create: { status: 'SHIPPED' },
        },
      },
      include: { items: { include: { product: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'ORDER_SHIPPED',
        entityType: 'order',
        entityId: id.toString(),
        userId,
        newValues: JSON.stringify(serializeBigInt({ status: 'SHIPPED' })),
      },
    });

    // Invalidate caches before returning response
    await this.invalidateOrderCaches();

    return convertToSnakeCase(serializeBigInt(updated));
  }

  async completeOrder(id: number, userId: number) {
    const order = await this.getOrderById(id);
    OrderStateMachine.validateTransition(order.status, 'COMPLETED', 'ADMIN');

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        statusHistories: {
          create: { status: 'COMPLETED' },
        },
      },
      include: { items: { include: { product: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'ORDER_COMPLETED',
        entityType: 'order',
        entityId: id.toString(),
        userId,
        newValues: JSON.stringify(serializeBigInt({ status: 'COMPLETED' })),
      },
    });

    // Invalidate caches before returning response
    await this.invalidateOrderCaches();

    return convertToSnakeCase(serializeBigInt(updated));
  }

 async cancelOrder(
  orderId: bigint,
  userId: bigint,
  cancelReason: string,
) {
  const result = await this.prisma.$transaction(async (tx) => {
    const currentOrder = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!currentOrder) {
      throw new NotFoundException('Order not found');
    }

    if (currentOrder.status === 'CANCELLED') {
      throw new ConflictException('Order already cancelled');
    }

    OrderStateMachine.validateTransition(
      currentOrder.status,
      'CANCELLED',
      'ADMIN',
    );

    // Restore stock and record movements
    for (const item of currentOrder.items) {
      const updatedProduct = await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { increment: item.quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'CANCEL_RESTORE',
          quantityChange: item.quantity,
          stockAfter: updatedProduct.stock,
          referenceType: 'order',
          referenceId: orderId.toString(),
          createdBy: userId,
        },
      });
    }

    const cancelledOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason,
        statusHistories: {
          create: {
            status: 'CANCELLED',
            reason: cancelReason,
          },
        },
      },
      include: { items: true },
    });

    await tx.auditLog.create({
      data: {
        action: 'ORDER_CANCELLED',
        entityType: 'order',
        entityId: orderId.toString(),
        userId,
        newValues: JSON.stringify(serializeBigInt({
          orderNumber: currentOrder.orderNumber,
          status: 'CANCELLED',
          reason: cancelReason,
        })),
      },
    });

    return serializeBigInt(cancelledOrder);
  });

  // Invalidate caches before returning response
  await this.invalidateOrderCaches();

  return convertToSnakeCase(result);
}
}

import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { EmailService } from '../../../common/email.service';

/**
 * Invoice Generation Processor
 * 
 * Triggered when order status changes to PAID
 * Generates invoice and sends email to customer
 */

@Processor('invoice')
export class InvoiceProcessor {
  private readonly logger = new Logger(InvoiceProcessor.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  @Process({
    name: 'generate-invoice',
    concurrency: 3, // Process 3 invoices concurrently
  })
  async handleInvoiceGeneration(
    job: Job<{
      orderId: bigint;
      orderNumber: string;
      customerId: string;
      customerEmail?: string;
    }>,
  ) {
    const { orderId, orderNumber, customerId, customerEmail } = job.data;

    try {
      this.logger.debug(`[Job ${job.id}] Starting invoice generation for order ${orderNumber}`);

      // Fetch order details
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
        },
      });

      if (!order) {
        this.logger.warn(`[Job ${job.id}] Order ${orderNumber} not found`);
        throw new Error('Order not found');
      }

      // Check if invoice was already generated (idempotency)
      const existingInvoice = await this.prisma.auditLog.findFirst({
        where: {
          action: 'INVOICE_GENERATED',
          entityId: orderId.toString(),
        },
      });

      if (existingInvoice) {
        this.logger.debug(`[Job ${job.id}] Invoice already generated for order ${orderNumber}`);
        return {
          status: 'skipped',
          message: 'Invoice already generated',
          orderId,
        };
      }

      // Generate invoice HTML
      const invoiceHtml = this.generateInvoiceHTML(order);

      // In production, would convert to PDF and store
      // For now, just log and create audit entry
      this.logger.log(`[Job ${job.id}] Generated invoice for order ${orderNumber}`);

      // Create audit log for invoice generation
      await this.prisma.auditLog.create({
        data: {
          action: 'INVOICE_GENERATED',
          entityType: 'order',
          entityId: orderId.toString(),
          userId: BigInt(1), // System user
          metadata: JSON.stringify({
            orderNumber,
            customerEmail: customerEmail || order.customer?.email,
            generatedAt: new Date().toISOString(),
            totalAmount: order.totalAmount.toString(),
            itemCount: order.items.length,
          }),
        },
      });

      // Send invoice email to customer
      const emailSent = await this.emailService.sendInvoiceEmail(
        customerEmail || order.customer?.email || 'unknown@example.com',
        order.customer?.customerName || 'Valued Customer',
        orderNumber,
        invoiceHtml,
      );

      this.logger.log(`[Job ${job.id}] Invoice job completed for order ${orderNumber}`);

      return {
        status: 'success',
        orderId,
        orderNumber,
        itemsCount: order.items.length,
        totalAmount: order.totalAmount.toString(),
        emailSent,
      };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Error generating invoice for order ${orderNumber}:`,
        error,
      );

      // Retry configuration handled by BullMQ default or queue settings
      throw error;
    }
  }

  /**
   * Generate simple invoice HTML
   * In production, would use template engine like handlebars
   */
  private generateInvoiceHTML(order: any): string {
    const itemsHtml = order.items
      .map(
        (item: any) =>
          `
      <tr>
        <td>${item.product.productCode}</td>
        <td>${item.product.productName}</td>
        <td>${item.quantity}</td>
        <td>Rp ${Number(item.unitPrice).toLocaleString('id-ID')}</td>
        <td>Rp ${Number(item.subtotal).toLocaleString('id-ID')}</td>
      </tr>
    `,
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${order.orderNumber}</title>
</head>
<body>
  <h1>INVOICE</h1>
  <p><strong>Order Number:</strong> ${order.orderNumber}</p>
  <p><strong>Customer:</strong> ${order.customer.customerName}</p>
  <p><strong>Date:</strong> ${order.createdAt.toISOString().split('T')[0]}</p>
  
  <table border="1" cellpadding="5">
    <thead>
      <tr>
        <th>Product Code</th>
        <th>Product Name</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  
  <p><strong>Total Amount:</strong> Rp ${Number(order.totalAmount).toLocaleString('id-ID')}</p>
</body>
</html>
    `;
  }

  // In production, would implement email sending
  // private async sendInvoiceEmail(email: string, invoiceHtml: string) {
  //   // Use SMTP service (Mailpit for local dev)
  // }
}

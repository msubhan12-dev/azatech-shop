import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Mailpit SMTP configuration (runs on localhost:1025 by default)
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'localhost',
      port: parseInt(process.env.MAIL_PORT || '1025'),
      secure: false, // Mailpit doesn't use TLS
      auth: process.env.MAIL_USER && process.env.MAIL_PASSWORD ? {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      } : undefined,
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        this.logger.warn(`[EmailService] Connection failed: ${error.message}`);
      } else {
        this.logger.log(`[EmailService] Connected to ${process.env.MAIL_HOST || 'localhost'}:${process.env.MAIL_PORT || '1025'}`);
      }
    });
  }

  /**
   * Send invoice email to customer
   */
  async sendInvoiceEmail(
    customerEmail: string,
    customerName: string,
    orderNumber: string,
    invoiceHtml: string,
  ): Promise<boolean> {
    try {
      this.logger.debug(`[sendInvoiceEmail] Sending invoice for ${orderNumber} to ${customerEmail}`);

      const result = await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'noreply@online-shop.local',
        to: customerEmail,
        subject: `Invoice ${orderNumber} - Online Shop`,
        html: `
          <h2>Hello ${customerName},</h2>
          <p>Thank you for your purchase! Your invoice is attached below:</p>
          ${invoiceHtml}
          <p>If you have any questions, please contact our support team.</p>
          <br/>
          <p>Best regards,<br/>Online Shop Team</p>
        `,
      });

      this.logger.log(`[sendInvoiceEmail] Invoice email sent for ${orderNumber}: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `[sendInvoiceEmail] Failed to send invoice for ${orderNumber}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send low stock alert email to admin
   */
  async sendLowStockAlert(
    adminEmail: string,
    adminName: string,
    productCode: string,
    productName: string,
    currentStock: number,
    threshold: number,
  ): Promise<boolean> {
    try {
      this.logger.debug(`[sendLowStockAlert] Sending alert for ${productCode} to ${adminEmail}`);

      const result = await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'noreply@online-shop.local',
        to: adminEmail,
        subject: `⚠️ Low Stock Alert: ${productCode}`,
        html: `
          <h2>Low Stock Alert</h2>
          <p>Hello ${adminName},</p>
          <p>The following product has fallen below the low stock threshold:</p>
          <table style="border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px;"><strong>Product Code:</strong></td>
              <td style="border: 1px solid #ddd; padding: 10px;">${productCode}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px;"><strong>Product Name:</strong></td>
              <td style="border: 1px solid #ddd; padding: 10px;">${productName}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px;"><strong>Current Stock:</strong></td>
              <td style="border: 1px solid #ddd; padding: 10px; color: red;"><strong>${currentStock} units</strong></td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px;"><strong>Low Stock Threshold:</strong></td>
              <td style="border: 1px solid #ddd; padding: 10px;">${threshold} units</td>
            </tr>
          </table>
          <p>Please reorder this product as soon as possible.</p>
          <br/>
          <p>Best regards,<br/>Inventory System</p>
        `,
      });

      this.logger.log(`[sendLowStockAlert] Alert email sent for ${productCode}: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `[sendLowStockAlert] Failed to send alert for ${productCode}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send order status notification email to customer
   */
  async sendOrderStatusEmail(
    customerEmail: string,
    customerName: string,
    orderNumber: string,
    status: string,
    message: string,
  ): Promise<boolean> {
    try {
      this.logger.debug(`[sendOrderStatusEmail] Sending ${status} notification for ${orderNumber} to ${customerEmail}`);

      const statusMessages: Record<string, string> = {
        PAID: '✅ Your payment has been received and your order is being prepared for shipment.',
        SHIPPED: '📦 Your order has been shipped! You can track it using the tracking number provided.',
        COMPLETED: '🎉 Your order has been delivered. Thank you for shopping with us!',
        CANCELLED: '❌ Your order has been cancelled. Please contact support if you have questions.',
      };

      const result = await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'noreply@online-shop.local',
        to: customerEmail,
        subject: `Order ${orderNumber} - ${status}`,
        html: `
          <h2>Order Status Update</h2>
          <p>Hello ${customerName},</p>
          <p><strong>Order Number:</strong> ${orderNumber}</p>
          <p><strong>Status:</strong> ${status}</p>
          <p>${statusMessages[status] || message}</p>
          <br/>
          <p>Best regards,<br/>Online Shop Team</p>
        `,
      });

      this.logger.log(`[sendOrderStatusEmail] Status email sent for ${orderNumber}: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `[sendOrderStatusEmail] Failed to send status email for ${orderNumber}:`,
        error,
      );
      throw error;
    }
  }
}

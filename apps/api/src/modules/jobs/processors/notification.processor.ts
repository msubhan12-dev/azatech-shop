import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { RedisService } from '../../../common/redis.service';
import { EmailService } from '../../../common/email.service';

/**
 * Notification Processor
 * 
 * Handles:
 * 1. Low stock alerts when product stock < lowStockThreshold
 * 2. Prevents duplicate notifications with cooldown
 */

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly NOTIFICATION_COOLDOWN_KEY = 'low-stock-notif:';
  private readonly COOLDOWN_MINUTES = 60; // Don't send duplicate for 1 hour

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private emailService: EmailService,
  ) {}

  @Process({
    name: 'low-stock-alert',
    concurrency: 2,
  })
  async handleLowStockAlert(
    job: Job<{
      productId: bigint;
      productCode: string;
      productName: string;
      currentStock: number;
      lowStockThreshold: number;
    }>,
  ) {
    const { productId, productCode, productName, currentStock, lowStockThreshold } = job.data;

    try {
      this.logger.debug(
        `[Job ${job.id}] Processing low stock alert for ${productCode}`,
      );

      // Check if we already sent a notification recently (prevent spam)
      const cacheKey = `${this.NOTIFICATION_COOLDOWN_KEY}${productId}`;
      const existingNotif = await this.redis.getClient()?.get(cacheKey);

      if (existingNotif) {
        this.logger.debug(
          `[Job ${job.id}] Notification already sent recently for ${productCode}, skipping`,
        );
        return {
          status: 'skipped',
          message: 'Notification sent recently, cooldown active',
          productId,
        };
      }

      // Get admin users to notify
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, name: true, email: true },
      });

      if (admins.length === 0) {
        this.logger.warn(`[Job ${job.id}] No admin users found to notify`);
        return { status: 'no_admins' };
      }

      // Create notification audit entries and send emails
      for (const admin of admins) {
        await this.prisma.auditLog.create({
          data: {
            action: 'LOW_STOCK_ALERT_SENT',
            entityType: 'product',
            entityId: productId.toString(),
            userId: admin.id,
            metadata: JSON.stringify({
              productCode,
              productName,
              currentStock,
              lowStockThreshold,
              adminEmail: admin.email,
              sentAt: new Date().toISOString(),
            }),
          },
        });

        // Send email to each admin
        try {
          await this.emailService.sendLowStockAlert(
            admin.email,
            admin.name,
            productCode,
            productName,
            currentStock,
            lowStockThreshold,
          );
        } catch (emailError) {
          this.logger.warn(
            `[Job ${job.id}] Failed to send email to ${admin.email}, but audit logged`,
          );
        }
      }

      this.logger.log(
        `[Job ${job.id}] Low stock alert sent for ${productCode} to ${admins.length} admins`,
      );

      // Set cooldown in Redis
      await this.redis
        .getClient()
        ?.setEx(
          cacheKey,
          this.COOLDOWN_MINUTES * 60,
          '1',
        );

      return {
        status: 'success',
        productId,
        productCode,
        notifiedAdmins: admins.length,
        cooldownMinutes: this.COOLDOWN_MINUTES,
      };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Error processing low stock alert:`,
        error,
      );
      throw error;
    }
  }

  @Process({
    name: 'order-notification',
    concurrency: 2,
  })
  async handleOrderNotification(
    job: Job<{
      orderId: bigint;
      orderNumber: string;
      customerEmail: string;
      status: string;
      message: string;
    }>,
  ) {
    const { orderId, orderNumber, customerEmail, status, message } = job.data;

    try {
      this.logger.debug(
        `[Job ${job.id}] Sending ${status} notification for order ${orderNumber}`,
      );

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          action: `ORDER_${status}_NOTIFICATION_SENT`,
          entityType: 'order',
          entityId: orderId.toString(),
          userId: BigInt(1), // System user
          metadata: JSON.stringify({
            orderNumber,
            customerEmail,
            message,
            sentAt: new Date().toISOString(),
          }),
        },
      });

      // Send email to customer
      try {
        await this.emailService.sendOrderStatusEmail(
          customerEmail,
          orderNumber.split('-')[0], // Simple customer reference
          orderNumber,
          status,
          message,
        );
      } catch (emailError) {
        this.logger.warn(
          `[Job ${job.id}] Failed to send email to ${customerEmail}, but audit logged`,
        );
      }

      this.logger.log(
        `[Job ${job.id}] Order notification sent for ${orderNumber} to ${customerEmail}`,
      );

      return {
        status: 'success',
        orderId,
        orderNumber,
        customerEmail,
        notificationType: status,
      };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Error sending order notification:`,
        error,
      );
      throw error;
    }
  }

  // In production, would implement email sending
  // private async sendEmailNotification(...) {
  //   // Use nodemailer or similar with Mailpit SMTP
  // }
  // 
  // private async sendOrderNotification(...) {
  //   // Similar email implementation
  // }
}

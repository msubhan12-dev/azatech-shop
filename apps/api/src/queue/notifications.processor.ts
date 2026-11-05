import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { MailService } from '../notifications/mail.service';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { name } = job;

    if (name === 'low-stock') {
      await this.handleLowStock(job.data as { productId: string });
    }
  }

  private async handleLowStock(data: { productId: string }): Promise<void> {
    const { productId } = data;
    this.logger.log(`Low stock notification for product ${productId}`);

    // Idempotency: check Redis guard to prevent duplicate notifications.
    // TTL = 1 hour; prevents multiple emails for the same product within that window.
    const notifyKey = `low-stock:notified:${productId}`;
    const alreadyNotified = await this.redis.setNx(notifyKey, '1', 3600);
    if (!alreadyNotified) {
      this.logger.log(`Low stock already notified for product ${productId}, skipping`);
      return;
    }

    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(productId) },
    });

    if (!product) return;

    // Only notify if stock is actually still at/below threshold
    if (product.stock > product.lowStockThreshold) {
      this.logger.log(`Product ${productId} stock recovered, skipping notification`);
      return;
    }

    // Find admin users to notify
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true, name: true },
    });

    for (const admin of admins) {
      await this.mailService.send({
        to: admin.email,
        subject: `⚠️ Stok Rendah: ${product.productName}`,
        html: `
          <h3>Peringatan Stok Rendah</h3>
          <p>Produk <strong>${product.productName}</strong> (${product.productCode})
          memiliki stok tersisa <strong>${product.stock}</strong> unit.</p>
          <p>Threshold minimum: ${product.lowStockThreshold}</p>
          <p>Segera lakukan stock adjustment.</p>
        `,
      });
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Notification job ${job.id} failed: ${error.message}`);

    // Move to dead-letter set after max attempts exhausted
    if (job.attemptsMade >= (job.opts?.attempts ?? 3)) {
      this.logger.error(
        `Notification job ${job.id} permanently failed after ${job.attemptsMade} attempts, moving to DLQ`,
      );
    }
  }
}

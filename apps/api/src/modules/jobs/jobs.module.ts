import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { InvoiceProcessor } from './processors/invoice.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { EmailService } from '../../common/email.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'invoice' },
      { name: 'notifications' },
    ),
  ],
  providers: [
    InvoiceProcessor,
    NotificationProcessor,
    PrismaService,
    RedisService,
    EmailService,
  ],
  exports: [],
})
export class JobsModule {}

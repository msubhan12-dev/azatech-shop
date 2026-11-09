import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'invoice' },
      { name: 'notifications' },
    ),
    ReportsModule,
  ],
  providers: [OrdersService, PrismaService, RedisService],
  controllers: [OrdersController],
})
export class OrdersModule {}

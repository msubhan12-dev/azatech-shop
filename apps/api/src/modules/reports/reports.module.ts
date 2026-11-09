import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';

@Module({
  providers: [ReportsService, PrismaService, RedisService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}

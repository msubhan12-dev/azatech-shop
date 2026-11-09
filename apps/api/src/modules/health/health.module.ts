import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';

@Module({
  providers: [PrismaService, RedisService],
  controllers: [HealthController],
})
export class HealthModule {}

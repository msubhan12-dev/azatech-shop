import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService, PrismaService, RedisService],
})
export class AuditModule {}

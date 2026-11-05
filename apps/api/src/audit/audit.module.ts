import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditModule as AuditCoreModule } from '../common/audit/audit.module';

@Module({
  imports: [AuditCoreModule],
  controllers: [AuditController],
})
export class AuditModule {}

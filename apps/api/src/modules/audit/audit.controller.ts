import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtGuard } from '../../modules/auth/guards/jwt.guard';
import { AuditService } from './audit.service';

@ApiTags('Audit & Logs')
@ApiBearerAuth('JWT')
@Controller('api/audit-logs')
@UseGuards(JwtGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Get Audit Logs',
    description: 'Retrieve system audit trail with filters for action, entity type, and user',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'action', required: false, type: String, description: 'Filter by action (CREATE, UPDATE, DELETE, LOGIN, etc.)' })
  @ApiQuery({ name: 'entityType', required: false, type: String, description: 'Filter by entity type (Order, Product, Customer, etc.)' })
  @ApiQuery({ name: 'userId', required: false, type: Number, description: 'Filter by user ID' })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved',
    schema: {
      example: {
        data: [
          {
            id: 1,
            action: 'CREATE',
            entity_type: 'Order',
            entity_id: 1,
            user_id: 17,
            changes: { order_status: 'PENDING' },
            timestamp: '2026-11-08T02:00:00Z',
          },
        ],
        total: 150,
        page: 1,
        limit: 10,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: number,
  ) {
    return this.auditService.getLogs(
      parseInt(page.toString()),
      parseInt(limit.toString()),
      action,
      entityType,
      userId ? parseInt(userId.toString()) : undefined,
    );
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Audit Metrics',
    description: 'Get summary statistics from audit logs (counts by action and entity type)',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics data',
    schema: {
      example: {
        total_logs: 150,
        actions: {
          CREATE: 50,
          UPDATE: 60,
          DELETE: 10,
          LOGIN: 30,
        },
        entity_types: {
          Order: 60,
          Product: 30,
          Customer: 20,
          User: 40,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMetrics() {
    return this.auditService.getMetrics();
  }

  @Get('redis-keys')
  @ApiOperation({
    summary: 'Redis Cache Keys',
    description: 'Get all cached keys and their TTL (for monitoring cache efficiency)',
  })
  @ApiResponse({
    status: 200,
    description: 'Redis cache keys',
    schema: {
      example: {
        keys: [
          {
            key: 'dashboard_summary',
            ttl: 300,
          },
          {
            key: 'sales_report:2026-10-01:2026-11-08:day',
            ttl: 3600,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRedisKeys() {
    return this.auditService.getRedisKeys();
  }
}

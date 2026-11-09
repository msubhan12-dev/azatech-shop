import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';

@ApiTags('System')
@Controller('api/health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health Check',
    description: 'Check API, database, and Redis service health status',
  })
  @ApiResponse({
    status: 200,
    description: 'All services healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-11-08T03:00:00.000Z',
        database: 'connected',
        redis: 'connected',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Some services degraded',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-11-08T03:00:00.000Z',
        database: 'connected',
        redis: 'disconnected',
      },
    },
  })
  async health() {
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'unknown',
      redis: 'unknown',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      status.database = 'connected';
    } catch (error) {
      status.database = 'disconnected';
    }

    try {
      await this.redis.get('health_check');
      status.redis = 'connected';
    } catch (error) {
      status.redis = 'disconnected';
    }

    return status;
  }
}

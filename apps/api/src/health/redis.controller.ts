import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RedisService } from '../common/redis/redis.service';

@ApiTags('Monitoring')
@ApiBearerAuth()
@Controller('redis')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class RedisController {
  constructor(private readonly redis: RedisService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get Redis connection statistics and memory usage (admin only)' })
  async getStats() {
    try {
      const stats = await this.redis.getStats();
      return {
        data: stats,
      };
    } catch (error) {
      return {
        data: null,
        error: 'Unable to connect to Redis',
      };
    }
  }
}

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RedisController } from './redis.controller';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [HealthController, RedisController],
})
export class HealthModule {}

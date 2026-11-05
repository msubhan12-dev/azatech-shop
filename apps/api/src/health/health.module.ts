import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RedisController } from './redis.controller';

@Module({
  controllers: [HealthController, RedisController],
})
export class HealthModule {}

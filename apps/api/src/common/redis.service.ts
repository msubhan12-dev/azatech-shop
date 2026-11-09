import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: RedisClientType;

  async onModuleInit(): Promise<void> {
    try {
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          reconnectStrategy: () => false, // Don't reconnect
          connectTimeout: 2000,
        },
      });

      this.client.on('error', () => {
        // Silently fail
      });

      // Non-blocking connect
      this.client.connect().catch(() => {
        // Ignore
      });
    } catch (err) {
      // Ignore
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.client?.isOpen) return null;
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (!this.client?.isOpen) return;
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // Silently fail
    }
  }

  async del(key: string): Promise<number> {
    try {
      if (!this.client?.isOpen) return 0;
      return await this.client.del(key);
    } catch {
      return 0;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      if (!this.client?.isOpen) return 0;
      return await this.client.incr(key);
    } catch {
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!this.client?.isOpen) return false;
      return await this.client.expire(key, seconds);
    } catch {
      return false;
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }
}
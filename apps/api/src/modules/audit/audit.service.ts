import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { Decimal } from '@prisma/client/runtime/library';

function serializeBigInt(obj: any): any {
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === 'bigint') return Number(obj);
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Decimal) return obj.toNumber?.() || Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[key] = serializeBigInt(value);
    return acc;
  }, {} as any);
}

@Injectable()
export class AuditService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getLogs(
    page = 1,
    limit = 10,
    action?: string,
    entityType?: string,
    userId?: number,
  ) {
    const where: any = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

    const logs = await (this.prisma.auditLog as any).findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.auditLog.count({ where });

    // Ensure createdAt is a proper timestamp
    const logsWithProperDates = logs.map((log: any) => ({
      ...log,
      createdAt: log.createdAt,
    }));

    return {
      data: serializeBigInt(logsWithProperDates),
      meta: {
        page,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getMetrics() {
    const totalOrders = await this.prisma.order.count();
    const pendingOrders = await this.prisma.order.count({
      where: { status: 'PENDING' },
    });
    const lowStockProducts = await this.prisma.product.count({
      where: {
        deletedAt: null,
        stock: { lt: this.prisma.product.fields.lowStockThreshold },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await this.prisma.order.count({
      where: {
        createdAt: { gte: today },
      },
    });

    // Get Redis info
    let redisMemory = 0;
    let redisKeys = 0;
    try {
      const client = this.redis.getClient();
      if (client?.isOpen) {
        const info = await client.info('memory');
        const memMatch = info.match(/used_memory:(\d+)/);
        if (memMatch) redisMemory = parseInt(memMatch[1]);
        
        const dbSize = await client.dbSize();
        redisKeys = dbSize;
      }
    } catch (e) {
      // Silently fail
    }

    return {
      totalOrders,
      todayOrders,
      pendingOrders,
      lowStockProducts,
      redisMemory,
      redisKeys,
      databaseStatus: 'connected',
      redisStatus: 'connected',
    };
  }

  async getRedisKeys() {
    const keys: any[] = [];
    try {
      const client = this.redis.getClient();
      if (client?.isOpen) {
        const allKeys = await client.keys('*');
        for (const key of allKeys) {
          const ttl = await client.ttl(key);
          const type = await client.type(key);
          keys.push({
            key,
            type,
            ttl: ttl === -1 ? 'No expiry' : `${ttl}s`,
          });
        }
      }
    } catch (e) {
      // Silently fail
    }
    return keys;
  }
}

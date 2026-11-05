import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

export interface AuditLogPayload {
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId?: bigint;
  details?: Record<string, unknown>;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  relatedEntities?: Array<{ type: string; id: string }>;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log a user action to the audit_logs table
   */
  async log(payload: AuditLogPayload): Promise<void> {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId,
          userId: payload.userId ? BigInt(payload.userId.toString()) : null,
          details: payload.details as any,
          oldValues: payload.oldValues as any,
          newValues: payload.newValues as any,
          ipAddress: payload.ipAddress || null,
          userAgent: payload.userAgent || null,
        },
      });

      // Log related entities if any
      if (payload.relatedEntities && payload.relatedEntities.length > 0) {
        await this.prisma.auditLogRelation.createMany({
          data: payload.relatedEntities.map((entity) => ({
            auditLogId: auditLog.id,
            relatedType: entity.type,
            relatedId: entity.id,
          })),
        });
      }
    } catch (error) {
      // Log errors but don't throw — audit logging should never block business logic
      console.error('Audit logging failed:', error);
    }
  }

  /**
   * Get audit logs for an entity with pagination
   */
  async getLogsForEntity(
    entityType: string,
    entityId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // AuditLogRelation would go here if using separate table
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get audit logs for a user
   */
  async getLogsForUser(userId: bigint, limit: number = 50, offset: number = 0) {
    return this.prisma.auditLog.findMany({
      where: {
        userId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get recent audit logs (for dashboard/activity feed)
   */
  async getRecentLogs(limit: number = 20) {
    return this.prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Count audit logs for an entity
   */
  async countLogsForEntity(entityType: string, entityId: string): Promise<number> {
    return this.prisma.auditLog.count({
      where: {
        entityType,
        entityId,
      },
    });
  }
}

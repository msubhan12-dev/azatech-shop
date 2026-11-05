import { Controller, Get, Query, UseGuards, Param, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from '../common/audit/audit.service';
import { Response } from 'express';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private auditService: AuditService) {}

  /**
   * Get audit logs for a specific entity
   * GET /audit-logs/entity?type=Order&id=123&limit=50&offset=0
   */
  @Get('entity')
  async getEntityLogs(
    @Query('type') type: string,
    @Query('id') id: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const logs = await this.auditService.getLogsForEntity(
      type,
      id,
      parseInt(limit),
      parseInt(offset),
    );
    const count = await this.auditService.countLogsForEntity(type, id);

    return {
      data: logs,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    };
  }

  /**
   * Get recent audit logs (activity feed)
   * GET /audit-logs/recent?limit=20
   */
  @Get('recent')
  async getRecentLogs(@Query('limit') limit: string = '20') {
    const logs = await this.auditService.getRecentLogs(parseInt(limit));
    return {
      data: logs,
    };
  }

  /**
   * Export audit logs as CSV
   * GET /audit-logs/export?type=Order&id=123
   */
  @Get('export')
  async exportLogs(
    @Query('type') type: string,
    @Query('id') id: string,
    @Res() res: Response,
  ) {
    try {
      const logs = await this.auditService.getLogsForEntity(type, id, 1000, 0);

      // Build CSV
      const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details'];
      const rows = logs.map((log: any) => [
        log.createdAt.toISOString(),
        log.user?.name || 'System',
        log.action,
        log.entityType,
        log.entityId,
        log.details ? JSON.stringify(log.details) : '',
      ]);

      const csv = [headers, ...rows].map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${type}-${id}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(400).json({ error: 'Failed to export audit logs' });
    }
  }
}

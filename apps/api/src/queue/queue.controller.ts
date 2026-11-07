import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

interface QueueInfo {
  name: string;
  jobCounts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  jobTypes: {
    [key: string]: string;
  };
  config: {
    retryAttempts: number;
    backoffType: string;
    initialDelay: number;
    keepCompleted: number;
    keepFailed: number;
  };
}

@ApiTags('Queue')
@ApiBearerAuth()
@Controller('queue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class QueueController {
  private jobDescriptions = {
    invoice: 'Invoice Generation - Trigger: Order status changed to PAID. Generate HTML invoice and send email notification.',
    notifications: 'Low Stock Notifications - Trigger: Product stock falls below threshold. Send alert email to admin.',
  };

  constructor(
    @InjectQueue('invoice') private invoiceQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get queue statistics and job information (admin only)' })
  async getQueueStats(): Promise<{ data: QueueInfo[] }> {
    const queues = [this.invoiceQueue, this.notificationsQueue];
    const stats: QueueInfo[] = [];

    for (const queue of queues) {
      const jobCounts = await queue.getJobCounts();
      
      stats.push({
        name: queue.name,
        jobCounts: {
          waiting: jobCounts.waiting || 0,
          active: jobCounts.active || 0,
          completed: jobCounts.completed || 0,
          failed: jobCounts.failed || 0,
          delayed: jobCounts.delayed || 0,
        },
        jobTypes: {
          [queue.name]: this.jobDescriptions[queue.name as keyof typeof this.jobDescriptions] || queue.name,
        },
        config: {
          retryAttempts: 3,
          backoffType: 'exponential',
          initialDelay: 1000,
          keepCompleted: 1000,
          keepFailed: 0,
        },
      });
    }

    return { data: stats };
  }

  @Get('jobs/:queueName')
  @ApiOperation({ summary: 'Get jobs in a specific queue (admin only)' })
  async getQueueJobs(queueName: string) {
    let queue: Queue | null = null;

    if (queueName === 'invoice') {
      queue = this.invoiceQueue;
    } else if (queueName === 'notifications') {
      queue = this.notificationsQueue;
    }

    if (!queue) {
      return { data: [] };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(0, 100),
      queue.getActive(0, 100),
      queue.getCompleted(0, 100),
      queue.getFailed(0, 100),
      queue.getDelayed(0, 100),
    ]);

    return {
      data: {
        waiting,
        active,
        completed,
        failed,
        delayed,
      },
    };
  }
}

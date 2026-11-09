import { Controller, Get, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Reports & Dashboard')
@ApiBearerAuth('JWT')
@Controller('api/reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('sales')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Sales Report',
    description: 'Get sales data grouped by day, week, or month. Cached for 1 hour.',
  })
  @ApiQuery({ name: 'from', type: String, required: true, description: 'Start date (ISO 8601, e.g., 2026-10-01)' })
  @ApiQuery({ name: 'to', type: String, required: true, description: 'End date (ISO 8601, e.g., 2026-11-08)' })
  @ApiQuery({ name: 'group_by', enum: ['day', 'week', 'month'], required: false, description: 'Group results by (default: day)' })
  @ApiResponse({
    status: 200,
    description: 'Sales report with date, order count, and total sales',
  })
  @ApiResponse({ status: 400, description: 'Invalid date format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSalesReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('group_by') groupBy = 'day',
    @CurrentUser() user: any,
  ) {
    const data = await this.reports.getSalesReport(new Date(from), new Date(to), groupBy as any);
    return { data };
  }

  @Get('top-products')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Top Products Report',
    description: 'Get best-selling products in a date range. Cached for 1 hour.',
  })
  @ApiQuery({ name: 'from', type: String, required: true, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', type: String, required: true, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Number of products to return (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Top products by revenue in date range',
  })
  @ApiResponse({ status: 400, description: 'Invalid date format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTopProducts(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit = '10',
    @CurrentUser() user: any,
  ) {
    const data = await this.reports.getTopProducts(new Date(from), new Date(to), parseInt(limit));
    return { data };
  }

  @Get('summary')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Dashboard Summary',
    description: 'Get dashboard summary: total orders, revenue, top customer, recent orders. Cached for 5 minutes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary: order statistics, revenue metrics, inventory, top customer, recent orders',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboardSummary() {
    const summary = await this.reports.getDashboardSummary();
    return summary;
  }
}

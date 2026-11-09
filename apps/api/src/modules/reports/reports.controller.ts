import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtGuard } from '../auth/guards/jwt.guard';

@ApiTags('Reports & Dashboard')
@ApiBearerAuth('JWT')
@Controller('api')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('reports/sales')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Sales Report', description: 'Get sales data grouped by day or month. Cached 1 hour.' })
  @ApiQuery({ name: 'from', type: String, required: true })
  @ApiQuery({ name: 'to', type: String, required: true })
  @ApiQuery({ name: 'group_by', enum: ['day', 'month'], required: false })
  @ApiResponse({ status: 200, description: 'Sales report' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSalesReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('group_by') groupBy = 'day',
  ) {
    const data = await this.reports.getSalesReport(new Date(from), new Date(to), groupBy as any);
    return { data };
  }

  @Get('reports/top-products')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Top Products Report', description: 'Get best-selling products in a date range. Cached 1 hour.' })
  @ApiQuery({ name: 'from', type: String, required: true })
  @ApiQuery({ name: 'to', type: String, required: true })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Top products' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTopProducts(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit = '10',
  ) {
    const data = await this.reports.getTopProducts(new Date(from), new Date(to), parseInt(limit));
    return { data };
  }

  @Get('reports/summary')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Dashboard Summary (via reports)', description: 'Alias for /api/dashboard/summary. Cached 5 minutes.' })
  @ApiResponse({ status: 200, description: 'Dashboard summary' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSummaryViaReports() {
    return this.reports.getDashboardSummary();
  }

  @Get('dashboard/summary')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Dashboard Summary', description: 'Get dashboard summary: orders, revenue, inventory, recent activity. Cached 5 minutes.' })
  @ApiResponse({ status: 200, description: 'Dashboard summary' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboardSummary() {
    return this.reports.getDashboardSummary();
  }
}

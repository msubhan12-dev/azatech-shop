import { Controller, Get, Query, UseGuards, ParseIntPipe, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { IsOptional, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class SalesReportQuery {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateString()
  from!: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  to!: string;

  @ApiPropertyOptional({ enum: ['day', 'month'], default: 'day' })
  @IsOptional()
  @IsEnum(['day', 'month'])
  group_by?: 'day' | 'month' = 'day';
}

class TopProductsQuery {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateString()
  from!: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  to!: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales/export')
  @Audit({
    action: 'CREATE',
    entityType: 'Report',
    getEntityId: (response) => `export-${new Date().getTime()}`,
  })
  @ApiOperation({ summary: 'Export sales report as Excel (admin only)' })
  async exportSalesReport(
    @Query() query: SalesReportQuery,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.exportSalesReportToExcel(
      query.from,
      query.to,
      query.group_by ?? 'day',
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-penjualan-${new Date().getTime()}.xlsx"`);
    res.send(buffer);
  }

  @Get('sales')
  @ApiOperation({ summary: 'Sales report by period (admin only)' })
  getSales(@Query() query: SalesReportQuery) {
    return this.reportsService.getSalesReport(query.from, query.to, query.group_by ?? 'day');
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top products report (admin only)' })
  getTopProducts(@Query() query: TopProductsQuery) {
    return this.reportsService.getTopProducts(query.from, query.to, query.limit ?? 10);
  }
}

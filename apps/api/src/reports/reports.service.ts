import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesReport(from: string, to: string, groupBy: 'day' | 'month') {
    if (!from || !to) {
      throw new BadRequestException('Parameter from dan to wajib diisi');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    if (fromDate > toDate) {
      throw new BadRequestException('Tanggal from tidak boleh lebih dari to');
    }

    /**
     * Aggregate at DB level — no N+1 queries
     * Only count PAID, SHIPPED, COMPLETED orders
     */
    const truncFormat = groupBy === 'day' ? 'day' : 'month';
    
    // Build the query as a raw string to support dynamic truncFormat
    const query = `
      SELECT
        DATE_TRUNC('${truncFormat}', order_date)::date AS period,
        COUNT(*) AS total_orders,
        SUM(total_amount) AS total_revenue
      FROM orders
      WHERE order_date >= $1::timestamp
        AND order_date <= $2::timestamp
        AND status IN ('PAID', 'SHIPPED', 'COMPLETED')
      GROUP BY DATE_TRUNC('${truncFormat}', order_date)::date
      ORDER BY period ASC
    `;

    const results = await this.prisma.$queryRawUnsafe<
      Array<{ period: Date; total_orders: bigint; total_revenue: string }>
    >(query, fromDate.toISOString(), toDate.toISOString());

    return results.map((r) => ({
      period: r.period,
      totalOrders: Number(r.total_orders),
      totalRevenue: Number(r.total_revenue),
    }));
  }

  async getTopProducts(from: string, to: string, limit: number) {
    if (!from || !to) {
      throw new BadRequestException('Parameter from dan to wajib diisi');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const results = await this.prisma.$queryRaw<
      Array<{
        product_id: bigint;
        product_code: string;
        product_name: string;
        total_quantity: bigint;
        total_revenue: string;
      }>
    >`
      SELECT
        p.id AS product_id,
        p.product_code,
        p.product_name,
        SUM(oi.quantity) AS total_quantity,
        SUM(oi.subtotal) AS total_revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.order_date >= ${fromDate}
        AND o.order_date <= ${toDate}
        AND o.status IN ('PAID', 'SHIPPED', 'COMPLETED')
      GROUP BY p.id, p.product_code, p.product_name
      ORDER BY total_quantity DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      productId: r.product_id.toString(),
      productCode: r.product_code,
      productName: r.product_name,
      totalQuantity: Number(r.total_quantity),
      totalRevenue: Number(r.total_revenue),
    }));
  }

  /**
   * Export sales report as Excel file (buffer)
   */
  async exportSalesReportToExcel(from: string, to: string, groupBy: 'day' | 'month'): Promise<Buffer> {
    const salesData = await this.getSalesReport(from, to, groupBy);
    const topProducts = await this.getTopProducts(from, to, 10);

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Sales Report
    const salesSheet = workbook.addWorksheet('Laporan Penjualan');
    salesSheet.columns = [
      { header: 'Periode', key: 'period', width: 20 },
      { header: 'Total Order', key: 'totalOrders', width: 15 },
      { header: 'Total Revenue (Rp)', key: 'totalRevenue', width: 20 },
    ];

    // Add data rows
    salesData.forEach((row) => {
      salesSheet.addRow({
        period: new Date(row.period).toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        totalOrders: row.totalOrders,
        totalRevenue: row.totalRevenue,
      });
    });

    // Format header
    salesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    salesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    // Format numbers
    salesSheet.getColumn('totalRevenue').numFmt = '#,##0';

    // Sheet 2: Top Products
    const productsSheet = workbook.addWorksheet('Produk Terlaris');
    productsSheet.columns = [
      { header: 'Kode Produk', key: 'productCode', width: 15 },
      { header: 'Nama Produk', key: 'productName', width: 30 },
      { header: 'Qty Terjual', key: 'totalQuantity', width: 15 },
      { header: 'Total Revenue (Rp)', key: 'totalRevenue', width: 20 },
    ];

    topProducts.forEach((row) => {
      productsSheet.addRow({
        productCode: row.productCode,
        productName: row.productName,
        totalQuantity: row.totalQuantity,
        totalRevenue: row.totalRevenue,
      });
    });

    // Format header
    productsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    productsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    // Format numbers
    productsSheet.getColumn('totalRevenue').numFmt = '#,##0';

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

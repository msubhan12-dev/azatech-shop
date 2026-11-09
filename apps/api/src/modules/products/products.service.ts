import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// Helper to convert BigInt to Number in objects
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

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function convertToSnakeCase(obj: any): any {
  if (typeof obj === 'bigint') return Number(obj);
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Decimal) return obj.toNumber?.() || Number(obj);
  if (Array.isArray(obj)) return obj.map(convertToSnakeCase);
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const snakeKey = camelToSnake(key);
    acc[snakeKey] = convertToSnakeCase(value);
    return acc;
  }, {} as any);
}

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationQueue: Queue,
  ) {}

  async createProduct(
    productCode: string,
    productName: string,
    price: number,
    stock: number,
    lowStockThreshold: number,
    userId: number,
  ) {
    const product = await this.prisma.product.create({
      data: {
        productCode,
        productName,
        price: new Decimal(price),
        stock,
        lowStockThreshold,
      },
    });

    await this.prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: 'INITIAL',
        quantityChange: stock,
        stockAfter: stock,
        createdBy: userId,
        note: 'Initial stock',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'CREATE_PRODUCT',
        entityType: 'product',
        entityId: product.id.toString(),
        userId,
        newValues: JSON.stringify(serializeBigInt(product)),
      },
    });

    return convertToSnakeCase(serializeBigInt(product));
  }

  async getProducts(page = 1, limit = 10, search?: string) {
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { productCode: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.product.count({ where });

    return {
      data: convertToSnakeCase(serializeBigInt(products)),
      meta: {
        page,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    return convertToSnakeCase(serializeBigInt(product));
  }

  async updateProduct(
    id: number,
    data: Partial<any>,
    userId: number,
  ) {
    const old = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!old || old.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    // Convert snake_case to camelCase
    const updateData: any = {};
    if (data.product_code !== undefined) updateData.productCode = data.product_code;
    if (data.product_name !== undefined) updateData.productName = data.product_name;
    if (data.price !== undefined) updateData.price = new Decimal(data.price);
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.low_stock_threshold !== undefined) updateData.lowStockThreshold = data.low_stock_threshold;

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'UPDATE_PRODUCT',
        entityType: 'product',
        entityId: id.toString(),
        userId,
        oldValues: JSON.stringify(serializeBigInt(old)),
        newValues: JSON.stringify(serializeBigInt(updated)),
      },
    });

    return convertToSnakeCase(serializeBigInt(updated));
  }

  async deleteProduct(id: number, userId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'DELETE_PRODUCT',
        entityType: 'product',
        entityId: id.toString(),
        userId,
        oldValues: JSON.stringify(serializeBigInt(product)),
      },
    });

    return convertToSnakeCase(serializeBigInt(updated));
  }

  async adjustStock(
    id: number,
    quantityChange: number,
    note: string,
    userId: number,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    const newStock = product.stock + quantityChange;

    if (newStock < 0) {
      throw new BadRequestException('Stock cannot be negative');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });

    await this.prisma.stockMovement.create({
      data: {
        productId: id,
        type: 'ADJUSTMENT',
        quantityChange,
        stockAfter: newStock,
        note,
        createdBy: userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'STOCK_ADJUSTMENT',
        entityType: 'stock',
        entityId: id.toString(),
        userId,
        metadata: JSON.stringify({ quantityChange, note }),
      },
    });

    // Check if stock is now below threshold and queue alert
    if (newStock < product.lowStockThreshold && product.stock >= product.lowStockThreshold) {
      await this.notificationQueue.add(
        'low-stock-alert',
        {
          productId: product.id,
          productCode: product.productCode,
          productName: product.productName,
          currentStock: newStock,
          lowStockThreshold: product.lowStockThreshold,
        },
        { delay: 1000 }, // Delay 1 second before processing
      );
    }

    return convertToSnakeCase(serializeBigInt(updated));
  }

  async getStockMovements(productId: number, page = 1, limit = 10) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    const movements = await this.prisma.stockMovement.findMany({
      where: { productId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });

    const total = await this.prisma.stockMovement.count({ where: { productId } });

    return {
      data: convertToSnakeCase(serializeBigInt(movements)),
      meta: {
        page,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}

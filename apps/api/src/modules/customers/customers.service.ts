import { Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/prisma.service';

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
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async createCustomer(data: any, userId: number) {
    const customer = await this.prisma.customer.create({
      data: {
        customerName: data.customer_name,
        customerAddress: data.customer_address,
        gender: data.gender,
        birthDate: data.birth_date ? new Date(data.birth_date) : null,
        phone: data.phone,
        email: data.email,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'CREATE_CUSTOMER',
        entityType: 'customer',
        entityId: customer.id,
        userId,
        newValues: JSON.stringify(serializeBigInt(customer)),
      },
    });

    return convertToSnakeCase(serializeBigInt(customer));
  }

  async getCustomers(page = 1, limit = 10, search?: string) {
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await this.prisma.customer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.customer.count({ where });

    return {
      data: convertToSnakeCase(serializeBigInt(customers)),
      meta: {
        page,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getCustomerById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.deletedAt) {
      throw new NotFoundException('Customer not found');
    }
    return convertToSnakeCase(serializeBigInt(customer));
  }

  async updateCustomer(id: string, data: any, userId: number) {
    const old = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!old || old.deletedAt) {
      throw new NotFoundException('Customer not found');
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        customerName: data.customer_name || old.customerName,
        customerAddress: data.customer_address || old.customerAddress,
        gender: data.gender || old.gender,
        birthDate: data.birth_date ? new Date(data.birth_date) : old.birthDate,
        phone: data.phone || old.phone,
        email: data.email || old.email,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'UPDATE_CUSTOMER',
        entityType: 'customer',
        entityId: id,
        userId,
        oldValues: JSON.stringify(serializeBigInt(old)),
        newValues: JSON.stringify(serializeBigInt(updated)),
      },
    });

    return convertToSnakeCase(serializeBigInt(updated));
  }

  async deleteCustomer(id: string, userId: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.deletedAt) {
      throw new NotFoundException('Customer not found');
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'DELETE_CUSTOMER',
        entityType: 'customer',
        entityId: id,
        userId,
        oldValues: JSON.stringify(serializeBigInt(customer)),
      },
    });

    return convertToSnakeCase(serializeBigInt(updated));
  }
}

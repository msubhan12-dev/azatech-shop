import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiHeader } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Orders')
@ApiBearerAuth('JWT')
@Controller('api/orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Get()
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Get Orders',
    description: 'Retrieve list of orders with pagination, filtering by status and customer',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 5)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by order status (PENDING, PAID, SHIPPED, COMPLETED, CANCELLED)' })
  @ApiQuery({ name: 'customer_id', required: false, type: String, description: 'Filter by customer ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            order_number: 'ORD-2026-001',
            customer_id: '550e8400-e29b-41d4-a716-446655440000',
            total_amount: 30000000,
            order_status: 'PENDING',
            created_at: '2026-11-08T02:00:00Z',
            items: [
              {
                id: 1,
                product_id: 1,
                quantity: 2,
                unit_price: 15000000,
              },
            ],
          },
        ],
        total: 108,
        page: 1,
        limit: 5,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOrders(
    @Query('page') page = '1',
    @Query('limit') limit = '5',
    @Query('status') status?: string,
    @Query('customer_id') customerId?: string,
  ) {
    return this.orders.getOrders(parseInt(page), parseInt(limit), status, customerId);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Get Order Detail',
    description: 'Retrieve detailed information of a specific order including items and status history',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order details',
    schema: {
      example: {
        id: 1,
        order_number: 'ORD-2026-001',
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        total_amount: 30000000,
        order_status: 'PENDING',
        created_at: '2026-11-08T02:00:00Z',
        items: [
          {
            id: 1,
            product_id: 1,
            quantity: 2,
            unit_price: 15000000,
          },
        ],
        status_history: [
          {
            id: 1,
            from_status: null,
            to_status: 'PENDING',
            changed_at: '2026-11-08T02:00:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(@Param('id') id: string) {
    return this.orders.getOrderById(parseInt(id));
  }

  @Post()
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Create Order',
    description: 'Create a new order with items. Uses idempotency key to prevent duplicate orders. Returns 201 for new order, 200 if order already exists with same key, 409 if stock insufficient.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'UUID for idempotent request. If not provided, one is auto-generated. Same key + payload = guaranteed same order (no duplicate charge).',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    schema: {
      example: {
        id: 1,
        order_number: 'ORD-2026-001',
        order_status: 'PENDING',
        total_amount: 30000000,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Order already exists (same idempotency key)',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (missing required fields)',
    schema: {
      example: {
        message: ['items must be an array', 'items must not be empty'],
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT required',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - insufficient stock for one or more items',
    schema: {
      example: {
        message: 'Insufficient stock for product ID 1. Available: 5, Requested: 10',
        statusCode: 409,
      },
    },
  })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const key = idempotencyKey || uuidv4();

    return this.orders.createOrder(dto, user.sub, key);
  }

  @Post(':id/pay')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Pay Order',
    description: 'Transition order from PENDING to PAID status. Triggers invoice generation job. Only PENDING orders can be paid.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order payment processed successfully',
    schema: {
      example: {
        id: 1,
        order_status: 'PAID',
        message: 'Order paid successfully. Invoice will be generated.',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - order not in PENDING status or transition not allowed',
    schema: {
      example: {
        message: 'Cannot transition from PAID to PAID',
        statusCode: 409,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async payOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.orders.payOrder(parseInt(id), user.sub, user.role);
  }

  @Post(':id/ship')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Ship Order',
    description: 'Transition order from PAID to SHIPPED status. Only PAID orders can be shipped.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order shipped successfully',
    schema: {
      example: {
        id: 1,
        order_status: 'SHIPPED',
        message: 'Order shipped successfully.',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - order not in PAID status',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async shipOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.orders.shipOrder(parseInt(id), user.sub);
  }

  @Post(':id/complete')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Complete Order',
    description: 'Transition order from SHIPPED to COMPLETED status. Only SHIPPED orders can be completed.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order completed successfully',
    schema: {
      example: {
        id: 1,
        order_status: 'COMPLETED',
        message: 'Order completed successfully.',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - order not in SHIPPED status',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async completeOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.orders.completeOrder(parseInt(id), user.sub);
  }

  @Post(':id/invoice/validate')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Validate Invoice Tax',
    description: 'Validate invoice tax calculation and detect potential fraud. Returns validation result with corrected amounts.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice validation result',
    schema: {
      example: {
        valid: true,
        message: 'Invoice calculation is correct',
        details: {
          subtotal: 30000000,
          tax_rate: 0.1,
          calculated_tax: 3000000,
          submitted_tax: 3000000,
          total: 33000000,
          is_correct: true,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async validateInvoiceTax(@Param('id') id: string) {
    return this.orders.validateInvoiceTax(parseInt(id));
  }

  @Post(':id/cancel')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Cancel Order',
    description: 'Cancel an order and restore reserved stock. Can only cancel PENDING orders. Returns restored stock to inventory.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
    schema: {
      example: {
        id: 1,
        order_status: 'CANCELLED',
        message: 'Order cancelled. Stock restored.',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - order not in cancellable status',
    schema: {
      example: {
        message: 'Cannot cancel order in COMPLETED status',
        statusCode: 409,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.orders.cancelOrder(
      BigInt(id),
      BigInt(user.sub),
      dto.cancel_reason,
    );
  }
}

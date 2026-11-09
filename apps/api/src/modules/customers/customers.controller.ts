import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Customers')
@ApiBearerAuth('JWT')
@Controller('api/customers')
export class CustomersController {
  constructor(private customers: CustomersService) {}

  @Get()
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Get Customers',
    description: 'Retrieve list of customers with pagination and search',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 5)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by customer name or email' })
  @ApiResponse({
    status: 200,
    description: 'Customers retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '081234567890',
            address: 'Jl. Merdeka 123',
            is_deleted: false,
          },
        ],
        total: 30,
        page: 1,
        limit: 5,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCustomers(
    @Query('page') page = '1',
    @Query('limit') limit = '5',
    @Query('search') search?: string,
  ) {
    return this.customers.getCustomers(parseInt(page), parseInt(limit), search);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Get Customer Detail',
    description: 'Retrieve detailed information of a specific customer',
  })
  @ApiParam({ name: 'id', type: String, description: 'Customer ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Customer details',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '081234567890',
        address: 'Jl. Merdeka 123',
        is_deleted: false,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getCustomerById(@Param('id') id: string) {
    return this.customers.getCustomerById(id);
  }

  @Post()
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Create Customer',
    description: 'Create a new customer',
  })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCustomer(
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.customers.createCustomer(dto, user.sub);
  }

  @Put(':id')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Update Customer',
    description: 'Update customer information',
  })
  @ApiParam({ name: 'id', type: String, description: 'Customer ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Customer updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async updateCustomer(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.customers.updateCustomer(id, dto, user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Delete Customer',
    description: 'Soft delete a customer (ADMIN only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Customer ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN role required' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async deleteCustomer(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can delete customers');
    }

    return this.customers.deleteCustomer(id, user.sub);
  }
}

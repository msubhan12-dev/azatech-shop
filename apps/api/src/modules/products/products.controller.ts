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
import { ProductsService } from './products.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth('JWT')
@Controller('api/products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get()
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Get Products',
    description: 'Retrieve list of products with pagination and search',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 5)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by product name or code' })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            product_code: 'PRD001',
            product_name: 'Laptop',
            price: 15000000,
            stock: 10,
            low_stock_threshold: 5,
            is_deleted: false,
          },
        ],
        total: 50,
        page: 1,
        limit: 5,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProducts(
    @Query('page') page = '1',
    @Query('limit') limit = '5',
    @Query('search') search?: string,
  ) {
    return this.products.getProducts(parseInt(page), parseInt(limit), search);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Get Product Detail',
    description: 'Retrieve detailed information of a specific product',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product details',
    schema: {
      example: {
        id: 1,
        product_code: 'PRD001',
        product_name: 'Laptop',
        price: 15000000,
        stock: 10,
        low_stock_threshold: 5,
        is_deleted: false,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductById(@Param('id') id: string) {
    return this.products.getProductById(parseInt(id));
  }

  @Post()
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Create Product',
    description: 'Create a new product (ADMIN only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    schema: {
      example: {
        id: 1,
        product_code: 'PRD001',
        product_name: 'Laptop',
        price: 15000000,
        stock: 0,
        low_stock_threshold: 5,
        is_deleted: false,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN role required' })
  async createProduct(
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can create products');
    }

    return this.products.createProduct(
      dto.product_code,
      dto.product_name,
      dto.price,
      dto.stock || 0,
      dto.low_stock_threshold || 5,
      user.sub,
    );
  }

  @Put(':id')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Update Product',
    description: 'Update product details (ADMIN only)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN role required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can update products');
    }

    return this.products.updateProduct(parseInt(id), dto, user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Delete Product',
    description: 'Soft delete a product (ADMIN only)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN role required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async deleteProduct(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can delete products');
    }

    return this.products.deleteProduct(parseInt(id), user.sub);
  }

  @Post(':id/stock-adjustments')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Adjust Product Stock',
    description: 'Adjust stock quantity for a product (ADMIN only)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Stock adjusted successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN role required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async adjustStock(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can adjust stock');
    }

    return this.products.adjustStock(
      parseInt(id),
      dto.quantity_change,
      dto.note,
      user.sub,
    );
  }

  @Get(':id/stock-movements')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Get Stock Movement History',
    description: 'Retrieve stock movement history for a product',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Stock movements retrieved',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getStockMovements(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.products.getStockMovements(parseInt(id), parseInt(page), parseInt(limit));
  }
}

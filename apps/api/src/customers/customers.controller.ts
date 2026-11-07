import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Audit } from '../common/decorators/audit.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers with pagination' })
  findAll(@Query() query: PaginationDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @Audit({
    action: 'CREATE',
    entityType: 'Customer',
    getEntityId: (response) => response.data?.id?.toString() || '',
  })
  @ApiOperation({ summary: 'Create customer' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Put(':id')
  @Audit({
    action: 'UPDATE',
    entityType: 'Customer',
    getEntityId: (response) => response.data?.id?.toString() || '',
  })
  @ApiOperation({ summary: 'Update customer' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @Audit({
    action: 'DELETE',
    entityType: 'Customer',
    getEntityId: (response) => response.data?.id?.toString() || '',
  })
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete customer (admin only)' })
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}

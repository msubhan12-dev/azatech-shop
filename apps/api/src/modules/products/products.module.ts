import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'notifications' },
    ),
  ],
  providers: [ProductsService, PrismaService],
  controllers: [ProductsController],
})
export class ProductsModule {}

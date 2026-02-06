import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { TraitsModule } from '../traits/traits.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), TraitsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

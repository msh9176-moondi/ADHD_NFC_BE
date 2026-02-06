import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Public } from '../auth/decorators';
import { User } from '../users/entities';
import { ProductCategory } from './entities';
import { ProductsService } from './products.service';
import {
  ProductsListResponseDto,
  RecommendedProductsResponseDto,
} from './dto';

/**
 * Products Controller
 * - 상품 목록은 @Public() - 비로그인도 조회 가능
 * - 추천 상품은 로그인 필요 (성향 기반)
 */
@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * 전체 상품 조회
   */
  @Public()
  @Get()
  @ApiOperation({ summary: '전체 상품 조회' })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ProductCategory,
    description: '카테고리 필터',
  })
  @ApiResponse({ status: 200, type: ProductsListResponseDto })
  async getProducts(
    @Query('category') category?: ProductCategory,
  ): Promise<ProductsListResponseDto> {
    const products = category
      ? await this.productsService.findByCategory(category)
      : await this.productsService.findAll();

    return { products };
  }

  /**
   * 성향 기반 추천 상품 조회
   */
  @Get('recommendations')
  @ApiBearerAuth()
  @ApiOperation({ summary: '성향 기반 추천 상품 조회' })
  @ApiResponse({ status: 200, type: RecommendedProductsResponseDto })
  async getRecommendations(
    @CurrentUser() user: User,
  ): Promise<RecommendedProductsResponseDto> {
    return this.productsService.getRecommendations(user.id);
  }
}

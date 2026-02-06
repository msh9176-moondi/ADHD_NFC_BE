import { ApiProperty } from '@nestjs/swagger';
import { ProductCategory, TraitType } from '../entities';

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty()
  price: number;

  @ApiProperty({ enum: ProductCategory })
  category: ProductCategory;

  @ApiProperty({ enum: TraitType, nullable: true })
  recommendedTrait: TraitType | null;

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  isComingSoon: boolean;
}

export class ProductsListResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  products: ProductResponseDto[];
}

export class RecommendedProductsResponseDto {
  @ApiProperty({ description: '사용자의 주요 성향' })
  topTrait: string | null;

  @ApiProperty({ type: [ProductResponseDto], description: '추천 상품 목록' })
  recommendations: ProductResponseDto[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 성향 타입 (trait)
 */
export enum TraitType {
  ATTENTION = 'attention',
  IMPULSIVE = 'impulsive',
  COMPLEX = 'complex',
  EMOTIONAL = 'emotional',
  MOTIVATION = 'motivation',
  ENVIRONMENT = 'environment',
}

/**
 * 상품 카테고리
 */
export enum ProductCategory {
  FOCUS = 'focus', // 집중력 도구
  WELLNESS = 'wellness', // 웰니스/건강
  LIFESTYLE = 'lifestyle', // 라이프스타일
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'int' })
  price: number;

  @Column({
    type: 'enum',
    enum: ProductCategory,
    default: ProductCategory.LIFESTYLE,
  })
  category: ProductCategory;

  @Column({
    type: 'enum',
    enum: TraitType,
    nullable: true,
    name: 'recommended_trait',
  })
  recommendedTrait: TraitType | null;

  @Column({ default: true, name: 'is_available' })
  isAvailable: boolean;

  @Column({ default: false, name: 'is_coming_soon' })
  isComingSoon: boolean;

  @Column({ default: 0, name: 'sort_order' })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

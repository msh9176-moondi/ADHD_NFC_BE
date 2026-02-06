import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductCategory, TraitType } from './entities';
import { TraitsService } from '../traits/traits.service';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly traitsService: TraitsService,
  ) {}

  /**
   * 앱 시작 시 시드 데이터 삽입
   */
  async onModuleInit() {
    const count = await this.productRepository.count();
    if (count === 0) {
      await this.seedProducts();
    }
  }

  /**
   * 전체 상품 조회
   */
  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isAvailable: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * 카테고리별 상품 조회
   */
  async findByCategory(category: ProductCategory): Promise<Product[]> {
    return this.productRepository.find({
      where: { category, isAvailable: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * 사용자 성향 기반 추천 상품 조회
   */
  async getRecommendations(
    userId: string,
  ): Promise<{ topTrait: string | null; recommendations: Product[] }> {
    // 사용자 성향 점수 조회
    const traitScore = await this.traitsService.findByUser(userId);

    if (!traitScore) {
      // 성향 테스트를 안 한 경우: 인기 상품 반환
      const popularProducts = await this.productRepository.find({
        where: { isAvailable: true, isComingSoon: false },
        order: { sortOrder: 'ASC' },
        take: 5,
      });
      return { topTrait: null, recommendations: popularProducts };
    }

    // 가장 높은 성향 찾기
    const traits: { key: TraitType; score: number }[] = [
      { key: TraitType.ATTENTION, score: traitScore.attention },
      { key: TraitType.IMPULSIVE, score: traitScore.impulsive },
      { key: TraitType.COMPLEX, score: traitScore.complex },
      { key: TraitType.EMOTIONAL, score: traitScore.emotional },
      { key: TraitType.MOTIVATION, score: traitScore.motivation },
      { key: TraitType.ENVIRONMENT, score: traitScore.environment },
    ];

    const topTrait = traits.reduce((max, trait) =>
      trait.score > max.score ? trait : max,
    );

    // 해당 성향에 맞는 추천 상품 조회
    const recommendations = await this.productRepository.find({
      where: {
        recommendedTrait: topTrait.key,
        isAvailable: true,
      },
      order: { sortOrder: 'ASC' },
      take: 5,
    });

    // 추천 상품이 부족하면 다른 상품으로 채우기
    if (recommendations.length < 5) {
      const additionalProducts = await this.productRepository.find({
        where: { isAvailable: true, isComingSoon: false },
        order: { sortOrder: 'ASC' },
        take: 5 - recommendations.length,
      });

      // 중복 제거
      const existingIds = new Set(recommendations.map((p) => p.id));
      for (const product of additionalProducts) {
        if (!existingIds.has(product.id)) {
          recommendations.push(product);
        }
      }
    }

    return { topTrait: topTrait.key, recommendations };
  }

  /**
   * 시드 데이터 삽입
   */
  private async seedProducts(): Promise<void> {
    const products: Partial<Product>[] = [
      // 판매 중
      {
        name: '체험단 전용 특전',
        description: '체험단 얼리버드 구매 특전: 추가 구성 증정',
        imageUrl: '/assets/items/gift.png',
        price: 105,
        category: ProductCategory.LIFESTYLE,
        recommendedTrait: null,
        isAvailable: true,
        isComingSoon: false,
        sortOrder: 1,
      },
      {
        name: '물뿌리개',
        description: '나무 성장 XP를 더 빨리 올려줘요',
        imageUrl: '/assets/items/watering-can.png',
        price: 15,
        category: ProductCategory.LIFESTYLE,
        recommendedTrait: null,
        isAvailable: true,
        isComingSoon: false,
        sortOrder: 2,
      },
      // 성향별 추천 상품
      {
        name: '타이머',
        description: '시간 감각을 잡아줘요. 집중력 향상을 위한 시간 관리 도구',
        imageUrl: '/assets/items/timer.png',
        price: 25,
        category: ProductCategory.FOCUS,
        recommendedTrait: TraitType.ATTENTION,
        isAvailable: true,
        isComingSoon: true,
        sortOrder: 10,
      },
      {
        name: '밸런스 보드',
        description: '몸을 쓰면 충동이 가라앉아요',
        imageUrl: '/assets/items/balance-board.png',
        price: 45,
        category: ProductCategory.WELLNESS,
        recommendedTrait: TraitType.IMPULSIVE,
        isAvailable: true,
        isComingSoon: true,
        sortOrder: 11,
      },
      {
        name: 'ADHD 플래너',
        description: '컨디션 기복을 구조로 받쳐줘요',
        imageUrl: '/assets/items/planner.png',
        price: 20,
        category: ProductCategory.FOCUS,
        recommendedTrait: TraitType.COMPLEX,
        isAvailable: true,
        isComingSoon: true,
        sortOrder: 12,
      },
      {
        name: '스트레스 볼',
        description: '감정 폭발 전에 손으로 진정',
        imageUrl: '/assets/items/stress-ball.png',
        price: 10,
        category: ProductCategory.WELLNESS,
        recommendedTrait: TraitType.EMOTIONAL,
        isAvailable: true,
        isComingSoon: true,
        sortOrder: 13,
      },
      {
        name: '알람 약통',
        description: '미루는 날에도 "시작"을 걸어줘요. 약 복용을 절대 놓치지 않게',
        imageUrl: '/assets/items/pill.png',
        price: 15,
        category: ProductCategory.WELLNESS,
        recommendedTrait: TraitType.MOTIVATION,
        isAvailable: true,
        isComingSoon: true,
        sortOrder: 14,
      },
      {
        name: '집중 환경 키트',
        description: '환경 세팅이 실행을 당겨줘요',
        imageUrl: '/assets/items/environment.png',
        price: 35,
        category: ProductCategory.LIFESTYLE,
        recommendedTrait: TraitType.ENVIRONMENT,
        isAvailable: true,
        isComingSoon: true,
        sortOrder: 15,
      },
      // 준비중 상품
      {
        name: '전문가 상담권',
        description: '(준비중) 전문가 상담 서비스',
        imageUrl: '/assets/items/ticket.png',
        price: 100,
        category: ProductCategory.WELLNESS,
        recommendedTrait: null,
        isAvailable: true,
        isComingSoon: true,
        sortOrder: 20,
      },
      {
        name: '커피 기프티콘',
        description: '(준비중) 나에게 주는 음료 한 잔',
        imageUrl: '/assets/items/coffee.png',
        price: 5,
        category: ProductCategory.LIFESTYLE,
        recommendedTrait: null,
        isAvailable: true,
        isComingSoon: true,
        sortOrder: 21,
      },
    ];

    await this.productRepository.save(
      products.map((p) => this.productRepository.create(p)),
    );

    console.log('[Products] 시드 데이터 삽입 완료:', products.length, '개');
  }
}

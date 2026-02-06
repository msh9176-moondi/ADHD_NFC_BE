import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CoinHistory, CoinTransactionType } from '../coin/entities/coin-history.entity';
import { GrowthTreeResponseDto, WateringCanPurchaseResponseDto } from './dto';

// 물뿌리개 상수
const WATERING_CAN_COST = 15;
const WATERING_CAN_XP_BONUS = 30;

/**
 * 레벨 설정 (프론트엔드와 동일)
 * - 레벨 1: 0-99 XP
 * - 레벨 2: 100-199 XP
 * - 레벨 3: 200-349 XP
 * - 레벨 4: 350-499 XP
 * - 레벨 5: 500-699 XP
 * - 레벨 6: 700-949 XP
 * - 레벨 7: 950-1249 XP
 * - 레벨 8+: 1250+ XP (이후 300 XP당 1레벨)
 */
const LEVEL_THRESHOLDS = [0, 100, 200, 350, 500, 700, 950, 1250];

/**
 * 나무 단계 (프론트엔드 GROWTH_STAGES와 동일 - 8단계)
 */
const TREE_STAGES = [
  { level: 1, name: '씨앗이 자라고 있어요!!' },
  { level: 2, name: '씨앗이 돋아났어요!' },
  { level: 3, name: '새싹이 자라고 있어요!!' },
  { level: 4, name: '잎이 무성해졌어요!' },
  { level: 5, name: '작은 나무가 되었어요!' },
  { level: 6, name: '나무가 자라고 있어요!' },
  { level: 7, name: '큰 나무가 되었어요!' },
  { level: 8, name: '나무에 열매가 맺혔어요!' },
];

@Injectable()
export class GrowthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CoinHistory)
    private readonly coinHistoryRepository: Repository<CoinHistory>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 성장 나무 정보 조회
   */
  async getGrowthTree(userId: string): Promise<GrowthTreeResponseDto> {
    // 유저 정보 조회
    const user = await this.userRepository.findOneOrFail({
      where: { id: userId },
    });

    // XP는 별도 필드, 코인도 별도 필드
    const currentXp = user.xp;
    const coins = user.coinBalance;
    const level = this.calculateLevel(currentXp);
    const { xpToNextLevel, progressPercent } = this.calculateProgress(currentXp, level);
    const { treeStage, treeStageName } = this.getTreeStage(level);

    // NFC 체크인 통계
    const totalCheckins = await this.getTotalCheckins(userId);
    const monthlyCheckins = await this.getMonthlyCheckins(userId);
    const checkedInToday = await this.hasCheckedInToday(userId);

    return {
      currentXp,
      coins,
      level,
      xpToNextLevel,
      progressPercent,
      treeStage,
      treeStageName,
      totalCheckins,
      monthlyCheckins,
      checkedInToday,
    };
  }

  /**
   * XP로 레벨 계산 (8단계 시스템)
   */
  private calculateLevel(xp: number): number {
    // 기본 레벨 (1-8)
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) {
        if (i === LEVEL_THRESHOLDS.length - 1) {
          // 레벨 8 이상: 300 XP당 1레벨 추가
          const extraXp = xp - LEVEL_THRESHOLDS[i];
          return i + 1 + Math.floor(extraXp / 300);
        }
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * 다음 레벨까지의 진행 상황 계산
   */
  private calculateProgress(
    xp: number,
    level: number,
  ): { xpToNextLevel: number; progressPercent: number } {
    let currentLevelXp: number;
    let nextLevelXp: number;

    if (level <= 7) {
      currentLevelXp = LEVEL_THRESHOLDS[level - 1];
      nextLevelXp = LEVEL_THRESHOLDS[level];
    } else {
      // 레벨 8 이상: 300 XP당 1레벨
      currentLevelXp = LEVEL_THRESHOLDS[7] + (level - 8) * 300;
      nextLevelXp = currentLevelXp + 300;
    }

    const xpInCurrentLevel = xp - currentLevelXp;
    const xpNeededForLevel = nextLevelXp - currentLevelXp;
    const xpToNextLevel = nextLevelXp - xp;
    const progressPercent = Math.floor((xpInCurrentLevel / xpNeededForLevel) * 100);

    return { xpToNextLevel, progressPercent };
  }

  /**
   * 레벨에 따른 나무 단계 조회 (레벨 = 단계, 최대 8단계)
   */
  private getTreeStage(level: number): { treeStage: number; treeStageName: string } {
    // 레벨이 8을 초과하면 8단계로 고정
    const stageIndex = Math.min(level, 8) - 1;
    const stage = TREE_STAGES[stageIndex];

    return {
      treeStage: stageIndex + 1,
      treeStageName: stage.name,
    };
  }

  /**
   * 총 NFC 체크인 횟수 조회
   */
  private async getTotalCheckins(userId: string): Promise<number> {
    return this.coinHistoryRepository.count({
      where: {
        userId,
        type: CoinTransactionType.EARN,
        description: 'NFC 로그인 보상',
      },
    });
  }

  /**
   * 이번 달 NFC 체크인 횟수 조회
   */
  private async getMonthlyCheckins(userId: string): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.coinHistoryRepository.count({
      where: {
        userId,
        type: CoinTransactionType.EARN,
        description: 'NFC 로그인 보상',
        createdAt: MoreThanOrEqual(monthStart),
      },
    });
  }

  /**
   * 오늘 체크인 여부 확인
   */
  private async hasCheckedInToday(userId: string): Promise<boolean> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCheckin = await this.coinHistoryRepository.findOne({
      where: {
        userId,
        type: CoinTransactionType.EARN,
        description: 'NFC 로그인 보상',
        createdAt: MoreThanOrEqual(todayStart),
      },
    });

    return !!todayCheckin;
  }

  /**
   * 물뿌리개 구매 - 코인을 사용하여 즉시 XP 보너스 획득
   * 트랜잭션으로 원자성 보장
   */
  async purchaseWateringCan(userId: string): Promise<WateringCanPurchaseResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      // 유저 조회 (트랜잭션 내에서 FOR UPDATE 락 적용)
      const user = await manager.findOneOrFail(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      // 코인 부족 체크
      if (user.coinBalance < WATERING_CAN_COST) {
        return {
          success: false,
          message: `코인이 부족합니다. (현재: ${user.coinBalance}, 필요: ${WATERING_CAN_COST})`,
          xpGained: 0,
          newTotalXp: user.xp,
          newLevel: this.calculateLevel(user.xp),
        };
      }

      // 코인 차감, XP 증가 (별도 관리)
      const newCoinBalance = user.coinBalance - WATERING_CAN_COST;
      const newXp = user.xp + WATERING_CAN_XP_BONUS;

      // 유저 업데이트: 코인 감소, XP 증가
      await manager.update(User, userId, {
        coinBalance: newCoinBalance,
        xp: newXp,
      });

      // 코인 히스토리 기록 - 사용
      const spendHistory = manager.create(CoinHistory, {
        userId,
        amount: -WATERING_CAN_COST,
        type: CoinTransactionType.USE,
        description: '물뿌리개 구매',
        balanceAfter: newCoinBalance,
      });
      await manager.save(spendHistory);

      const newLevel = this.calculateLevel(newXp);

      return {
        success: true,
        message: '물뿌리개로 나무에 물을 주었습니다! XP가 올랐어요!',
        xpGained: WATERING_CAN_XP_BONUS,
        newTotalXp: newXp,
        newLevel,
      };
    });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CoinHistory, CoinTransactionType } from './entities/coin-history.entity';

/**
 * 코인 설정값
 * TODO: 나중에 설정 테이블이나 환경변수로 분리 가능
 */
export const COIN_CONFIG = {
  NFC_LOGIN_REWARD: 15, // NFC 로그인/체크인 시 지급 코인 및 XP
};

@Injectable()
export class CoinService {
  constructor(
    @InjectRepository(CoinHistory)
    private readonly coinHistoryRepository: Repository<CoinHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 오늘 NFC 로그인 보상을 이미 받았는지 확인
   */
  async hasReceivedNfcRewardToday(userId: string): Promise<boolean> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existingReward = await this.coinHistoryRepository.findOne({
      where: {
        userId,
        type: CoinTransactionType.EARN,
        description: 'NFC 로그인 보상',
        createdAt: MoreThanOrEqual(todayStart),
      },
    });

    return !!existingReward;
  }

  /**
   * 코인 적립 (NFC 로그인 보상) - 하루 1회만 지급
   * 트랜잭션 + 락으로 Race Condition 방지
   * @returns CoinHistory | null (이미 오늘 받았으면 null)
   */
  async earnByNfcLogin(userId: string, referenceId?: string): Promise<CoinHistory | null> {
    return this.dataSource.transaction(async (manager) => {
      // 유저에 대해 락 획득 (동시 요청 방지)
      await manager.findOneOrFail(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      // 락 획득 후 중복 체크
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const existingReward = await manager.findOne(CoinHistory, {
        where: {
          userId,
          type: CoinTransactionType.EARN,
          description: 'NFC 로그인 보상',
          createdAt: MoreThanOrEqual(todayStart),
        },
      });

      if (existingReward) {
        return null;
      }

      // 유저 잔액 및 XP 업데이트
      const user = await manager.findOneOrFail(User, { where: { id: userId } });
      const newBalance = user.coinBalance + COIN_CONFIG.NFC_LOGIN_REWARD;
      const newXp = user.xp + COIN_CONFIG.NFC_LOGIN_REWARD;

      await manager.update(User, userId, {
        coinBalance: newBalance,
        xp: newXp,
      });

      // 이력 저장
      const history = manager.create(CoinHistory, {
        userId,
        type: CoinTransactionType.EARN,
        amount: COIN_CONFIG.NFC_LOGIN_REWARD,
        balanceAfter: newBalance,
        description: 'NFC 로그인 보상',
        referenceId: referenceId || null,
      });

      return manager.save(history);
    });
  }

  /**
   * 코인 적립 (일반) - 코인과 XP 동시 증가
   */
  async addCoin(
    userId: string,
    amount: number,
    type: CoinTransactionType,
    description?: string,
    referenceId?: string,
  ): Promise<CoinHistory> {
    // 트랜잭션으로 원자성 보장
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneOrFail(User, { where: { id: userId } });

      const newBalance = user.coinBalance + amount;
      const newXp = user.xp + amount; // XP도 같이 증가

      // 유저 잔액 및 XP 업데이트
      await manager.update(User, userId, {
        coinBalance: newBalance,
        xp: newXp,
      });

      // 이력 저장
      const history = manager.create(CoinHistory, {
        userId,
        type,
        amount,
        balanceAfter: newBalance,
        description: description || null,
        referenceId: referenceId || null,
      });

      return manager.save(history);
    });
  }

  /**
   * 코인 사용
   */
  async useCoin(
    userId: string,
    amount: number,
    description?: string,
    referenceId?: string,
  ): Promise<CoinHistory> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneOrFail(User, { where: { id: userId } });

      if (user.coinBalance < amount) {
        throw new Error('코인 잔액이 부족합니다');
      }

      const newBalance = user.coinBalance - amount;

      await manager.update(User, userId, { coinBalance: newBalance });

      const history = manager.create(CoinHistory, {
        userId,
        type: CoinTransactionType.USE,
        amount: -amount, // 사용은 음수로 기록
        balanceAfter: newBalance,
        description: description || null,
        referenceId: referenceId || null,
      });

      return manager.save(history);
    });
  }

  /**
   * 유저 코인 잔액 조회
   */
  async getBalance(userId: string): Promise<number> {
    const user = await this.userRepository.findOneOrFail({ where: { id: userId } });
    return user.coinBalance;
  }

  /**
   * 코인 이력 조회
   */
  async getHistory(userId: string, limit = 20, offset = 0): Promise<CoinHistory[]> {
    return this.coinHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}

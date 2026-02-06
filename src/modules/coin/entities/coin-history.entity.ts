import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * 코인 거래 유형
 */
export enum CoinTransactionType {
  EARN = 'earn', // 적립 (NFC 로그인 보상 등)
  USE = 'use', // 사용 (상품 구매 등)
  EXPIRE = 'expire', // 만료
  ADMIN_GRANT = 'admin_grant', // 관리자 지급
  ADMIN_DEDUCT = 'admin_deduct', // 관리자 차감
}

/**
 * Coin History Entity (코인 적립/사용 이력)
 *
 * 실무 포인트:
 * - 모든 코인 변동 내역을 기록 (추적 가능)
 * - amount: 양수(적립), 음수(사용/차감)
 * - balanceAfter: 거래 후 잔액 (정합성 검증용)
 */
@Entity('coin_histories')
export class CoinHistory extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: CoinTransactionType,
  })
  type: CoinTransactionType;

  @Column()
  amount: number; // 양수: 적립, 음수: 사용

  @Column({ name: 'balance_after' })
  balanceAfter: number; // 거래 후 잔액

  @Column({ type: 'varchar', nullable: true })
  description: string | null; // 거래 설명 (예: "NFC 로그인 보상")

  @Column({ type: 'varchar', nullable: true, name: 'reference_id' })
  referenceId: string | null; // 관련 ID (주문ID, NFC로그인ID 등)

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

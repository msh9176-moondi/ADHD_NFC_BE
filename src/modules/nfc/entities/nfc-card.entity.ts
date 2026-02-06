import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities';

/**
 * NFC Card Entity
 *
 * - cardUid: NFC 카드의 하드웨어 고유 ID (4, 7, 10 bytes → hex string)
 * - 한 유저가 여러 카드를 등록할 수 있음 (1:N 관계)
 * - isActive: 카드 분실 시 비활성화 가능
 * - lastUsedAt: 보안 감사 및 사용 패턴 분석용
 */
@Entity('nfc_cards')
@Index('idx_nfc_card_uid', ['cardUid'], { unique: true })
export class NfcCard extends BaseEntity {
  @Column({ name: 'card_uid', length: 32 })
  cardUid: string;

  @Column({ name: 'card_name', type: 'varchar', nullable: true, length: 50 })
  cardName: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'total_tag_count', default: 0 })
  totalTagCount: number;

  // Relations
  @ManyToOne(() => User, (user) => user.nfcCards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;
}

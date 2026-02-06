import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { AgreementType } from '../../common/enums';
import { User } from './user.entity';

/**
 * User Agreement Entity (약관 동의 이력)
 *
 * - 법적 증빙을 위해 동의 이력을 별도 테이블로 관리
 * - 약관 버전 관리: 약관이 변경되면 새 버전으로 재동의 받을 수 있다
 * - agreedAt: 동의 시점을 명확히 기록
 * - isAgreed: 동의 철회도 기록할 수 있도록 boolean으로 관리
 */
@Entity('user_agreements')
export class UserAgreement extends BaseEntity {
  @Column({
    type: 'enum',
    enum: AgreementType,
  })
  type: AgreementType;

  @Column({ name: 'is_agreed' })
  isAgreed: boolean;

  @Column({ name: 'agreed_at' })
  agreedAt: Date;

  @Column({ type: 'varchar', nullable: true, name: 'agreement_version' })
  agreementVersion: string | null;

  @Column({ name: 'user_id' })
  userId: string;

  // Relations
  @ManyToOne(() => User, (user) => user.agreements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

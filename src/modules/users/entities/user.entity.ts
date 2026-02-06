import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Role } from '../../common/enums';
import { NfcCard } from '../../nfc/entities';
import { SocialAccount } from './social-account.entity';
import { UserAgreement } from './user-agreement.entity';

/**
 * User Entity
 *
 * - 이메일 로그인 사용자: email + password 사용
 * - 소셜 로그인 사용자: email만 있고 password는 null
 * - 약관 동의 이력은 별도 테이블로 관리 (법적 증빙용)
 * - select: false로 민감정보 기본 제외
 */
@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', unique: true, nullable: true, name: 'user_number' })
  userNumber: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  password: string | null;

  @Column({ type: 'varchar', nullable: true })
  nickname: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'profile_image' })
  profileImage: string | null;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login_at' })
  lastLoginAt: Date | null;

  // 비밀번호 재설정 토큰
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'password_reset_token',
    select: false,
  })
  passwordResetToken: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'password_reset_expires',
    select: false,
  })
  passwordResetExpires: Date | null;

  // Refresh Token (해싱된 값 저장)
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'refresh_token',
    select: false,
  })
  refreshToken: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'refresh_token_expires',
    select: false,
  })
  refreshTokenExpires: Date | null;

  // 프로필 정보
  @Column({ type: 'varchar', nullable: true, name: 'real_name' })
  realName: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'zip_code' })
  zipCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'address_detail' })
  addressDetail: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'delivery_request' })
  deliveryRequest: string | null;

  // 코인 잔액 (마켓에서 사용)
  @Column({ default: 0, name: 'coin_balance' })
  coinBalance: number;

  // XP (나무 성장 경험치, 코인과 별도 관리)
  @Column({ default: 0 })
  xp: number;

  // NFC 총 조회수 (태깅 횟수)
  @Column({ default: 0, name: 'total_tag_count' })
  totalTagCount: number;

  // 플래너 고유 번호 (#으로 시작, 상품 구매 연동용)
  @Column({ type: 'varchar', nullable: true, name: 'planner_number' })
  plannerNumber: string | null;

  // Relations

  // 한명의 유저가 여러개의 소셜 계정을 가질 수 있다.
  @OneToMany(() => SocialAccount, (socialAccount) => socialAccount.user, {
    cascade: true,
  })
  socialAccounts: SocialAccount[];

  // 여러개의 agreements
  @OneToMany(() => UserAgreement, (agreement) => agreement.user, {
    cascade: true,
  })
  agreements: UserAgreement[];

  // 한명의 user는 여러개의 NFC 카드를 등록할 수 있다. (카드 유실시를 대비해서)
  @OneToMany(() => NfcCard, (nfcCard) => nfcCard.user, {
    cascade: true,
  })
  nfcCards: NfcCard[];
}

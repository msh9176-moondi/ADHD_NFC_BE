import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { SocialProvider } from '../../common/enums';
import { User } from './user.entity';

/**
 * Social Account Entity
 *
 * - 한 유저가 여러 소셜 계정을 연동할 수 있다
 * - provider + providerId 조합이 유니크해야 한다
 * - accessToken, refreshToken은 소셜 API 호출 시 필요할 수 있다
 */
@Entity('social_accounts')
@Unique(['provider', 'providerId'])
export class SocialAccount extends BaseEntity {
  @Column({
    type: 'enum',
    enum: SocialProvider,
  })
  provider: SocialProvider;

  @Column({ name: 'provider_id' })
  providerId: string;

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'access_token',
    select: false,
  })
  accessToken: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'refresh_token',
    select: false,
  })
  refreshToken: string | null;

  @Column({ name: 'user_id' })
  userId: string;

  // Relations
  @ManyToOne(() => User, (user) => user.socialAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

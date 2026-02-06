import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AgreementType, SocialProvider } from '../common/enums';
import { UpdateAddressDto, UpdateProfileDto } from './dto';
import { SocialAccount, User, UserAgreement } from './entities';

/**
 * 기본 프로필 이미지 URL
 * TODO: 실제 서비스에서는 S3 등에 업로드된 이미지 URL로 변경
 */
const DEFAULT_PROFILE_IMAGE = '/images/default-profile.png';

/**
 * Users Service
 *
 * - Repository 패턴을 사용하여 DB 접근을 추상화
 * - 각 메서드는 단일 책임 원칙을 따른다
 * - 트랜잭션이 필요한 경우 QueryRunner를 사용
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SocialAccount)
    private readonly socialAccountRepository: Repository<SocialAccount>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 이메일로 유저 조회
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * 이메일로 유저 조회 (비밀번호 포함)
   * 로그인 검증용
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  /**
   * ID로 유저 조회
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * 소셜 계정으로 유저 조회
   */
  async findBySocialAccount(
    provider: SocialProvider,
    providerId: string,
  ): Promise<User | null> {
    const socialAccount = await this.socialAccountRepository.findOne({
      where: { provider, providerId },
      relations: ['user'],
    });
    return socialAccount?.user || null;
  }

  /**
   * 이메일에서 닉네임 추출 (@ 앞부분)
   */
  private extractNicknameFromEmail(email: string): string {
    return email.split('@')[0];
  }

  /**
   * 고유 사용자 번호 생성 (ADHD0001, ADHD0002, ...)
   */
  private async generateUserNumber(): Promise<string> {
    const prefix = 'ADHD';

    // 가장 최근 사용자 번호 조회
    const lastUser = await this.userRepository
      .createQueryBuilder('user')
      .where('user.userNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('user.userNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastUser?.userNumber) {
      const lastNumber = parseInt(lastUser.userNumber.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    // 4자리 숫자로 패딩 (0001, 0002, ...)
    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * 이메일 회원가입으로 유저 생성
   * 트랜잭션으로 User + UserAgreement 원자성 보장
   */
  async createWithEmail(data: {
    email: string;
    hashedPassword: string;
    plannerNumber?: string;
    agreements: {
      termsOfService: boolean;
      privacyPolicy: boolean;
      marketing: boolean;
    };
  }): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const userNumber = await this.generateUserNumber();

      const user = manager.create(User, {
        userNumber,
        email: data.email,
        password: data.hashedPassword,
        nickname: this.extractNicknameFromEmail(data.email),
        profileImage: DEFAULT_PROFILE_IMAGE,
        plannerNumber: data.plannerNumber || null,
      });

      const savedUser = await manager.save(user);

      // 약관 동의 저장
      await this.saveAgreementsWithManager(
        manager,
        savedUser.id,
        data.agreements,
      );

      return savedUser;
    });
  }

  /**
   * 소셜 로그인으로 유저 생성
   * 트랜잭션으로 User + SocialAccount + UserAgreement 원자성 보장
   */
  async createWithSocial(data: {
    email: string;
    nickname?: string | null;
    profileImage?: string | null;
    provider: SocialProvider;
    providerId: string;
    accessToken?: string;
    refreshToken?: string;
    plannerNumber?: string;
    agreements: {
      termsOfService: boolean;
      privacyPolicy: boolean;
      marketing: boolean;
    };
  }): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const userNumber = await this.generateUserNumber();

      const user = manager.create(User, {
        userNumber,
        email: data.email,
        nickname: data.nickname || this.extractNicknameFromEmail(data.email),
        profileImage: data.profileImage || DEFAULT_PROFILE_IMAGE,
        plannerNumber: data.plannerNumber || null,
      });

      const savedUser = await manager.save(user);

      // 소셜 계정 연동
      const socialAccount = manager.create(SocialAccount, {
        userId: savedUser.id,
        provider: data.provider,
        providerId: data.providerId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      await manager.save(socialAccount);

      // 약관 동의 저장
      await this.saveAgreementsWithManager(
        manager,
        savedUser.id,
        data.agreements,
      );

      return savedUser;
    });
  }

  /**
   * 기존 유저에 소셜 계정 연동
   */
  async linkSocialAccount(
    userId: string,
    data: {
      provider: SocialProvider;
      providerId: string;
      accessToken?: string;
      refreshToken?: string;
    },
  ): Promise<SocialAccount> {
    const socialAccount = this.socialAccountRepository.create({
      userId,
      ...data,
    });
    return this.socialAccountRepository.save(socialAccount);
  }

  /**
   * 마지막 로그인 시간 업데이트
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }

  /**
   * 프로필 정보 수정
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    await this.userRepository.update(userId, dto);
    return this.userRepository.findOneOrFail({ where: { id: userId } });
  }

  /**
   * 배송지 정보 수정
   */
  async updateAddress(userId: string, dto: UpdateAddressDto): Promise<User> {
    await this.userRepository.update(userId, dto);
    return this.userRepository.findOneOrFail({ where: { id: userId } });
  }

  /**
   * 비밀번호 재설정 토큰 저장
   */
  async setPasswordResetToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });
  }

  /**
   * 비밀번호 재설정 토큰으로 유저 조회
   */
  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordResetToken')
      .addSelect('user.passwordResetExpires')
      .where('user.passwordResetToken = :token', { token })
      .andWhere('user.passwordResetExpires > :now', { now: new Date() })
      .getOne();
  }

  /**
   * 비밀번호 업데이트 및 토큰 초기화
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userRepository.update(userId, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  /**
   * 리프레시 토큰 저장
   */
  async setRefreshToken(
    userId: string,
    hashedToken: string,
    expires: Date,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      refreshToken: hashedToken,
      refreshTokenExpires: expires,
    });
  }

  /**
   * 리프레시 토큰으로 유저 조회
   */
  async findByRefreshToken(hashedToken: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.refreshToken')
      .addSelect('user.refreshTokenExpires')
      .where('user.refreshToken = :token', { token: hashedToken })
      .andWhere('user.refreshTokenExpires > :now', { now: new Date() })
      .getOne();
  }

  /**
   * 리프레시 토큰 초기화 (로그아웃)
   */
  async clearRefreshToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      refreshToken: null,
      refreshTokenExpires: null,
    });
  }

  /**
   * 약관 동의 저장 (트랜잭션용)
   */
  private async saveAgreementsWithManager(
    manager: EntityManager,
    userId: string,
    agreements: {
      termsOfService: boolean;
      privacyPolicy: boolean;
      marketing: boolean;
    },
  ): Promise<void> {
    const now = new Date();
    const agreementEntities = [
      manager.create(UserAgreement, {
        userId,
        type: AgreementType.TERMS_OF_SERVICE,
        isAgreed: agreements.termsOfService,
        agreedAt: now,
      }),
      manager.create(UserAgreement, {
        userId,
        type: AgreementType.PRIVACY_POLICY,
        isAgreed: agreements.privacyPolicy,
        agreedAt: now,
      }),
      manager.create(UserAgreement, {
        userId,
        type: AgreementType.MARKETING,
        isAgreed: agreements.marketing,
        agreedAt: now,
      }),
    ];

    await manager.save(agreementEntities);
  }
}

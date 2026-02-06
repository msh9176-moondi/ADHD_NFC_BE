import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SocialProvider } from '../common/enums';
import { MailService } from '../mail';
import { User } from '../users/entities';
import { UsersService } from '../users/users.service';
import {
  AuthResponseDto,
  ForgotPasswordRequestDto,
  LoginRequestDto,
  RefreshTokenResponseDto,
  ResetPasswordRequestDto,
  SignupRequestDto,
  SocialLoginRequestDto,
  UserResponseDto,
} from './dto';

/**
 * Auth Service
 *
 * - bcrypt salt rounds: 10~12가 적당 (보안과 성능 균형)
 * - JWT payload에는 최소 정보만 담습니다 (id, email 정도)
 * - 소셜 로그인은 Authorization Code 방식으로 처리
 *   1. 프론트엔드에서 code를 받아서 백엔드로 전송
 *   2. 백엔드에서 code를 accessToken으로 교환
 *   3. accessToken으로 프로필 조회
 */
@Injectable()
export class AuthService {
  private readonly BCRYPT_SALT_ROUNDS = 10;
  private readonly ACCESS_TOKEN_EXPIRES = '1h'; // 1시간
  private readonly REFRESH_TOKEN_EXPIRES_DAYS = 7; // 7일

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 소셜 로그인 URL 생성
   * auth_type=reprompt를 추가하여 매번 계정 선택 화면이 나오도록 함
   */
  getSocialLoginUrl(provider: string): string {
    const state = crypto.randomBytes(16).toString('hex');

    switch (provider.toLowerCase()) {
      case 'naver': {
        const clientId = this.configService.get<string>('NAVER_CLIENT_ID') || '';
        const redirectUri = this.configService.get<string>('NAVER_CALLBACK_URL') || '';
        return `https://nid.naver.com/oauth2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}&auth_type=reprompt`;
      }
      case 'kakao': {
        const clientId = this.configService.get<string>('KAKAO_CLIENT_ID') || '';
        const redirectUri = this.configService.get<string>('KAKAO_CALLBACK_URL') || '';
        return `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&prompt=login`;
      }
      case 'google': {
        const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
        const redirectUri = this.configService.get<string>('GOOGLE_CALLBACK_URL') || '';
        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&prompt=select_account`;
      }
      default:
        throw new BadRequestException('지원하지 않는 소셜 로그인입니다');
    }
  }

  /**
   * 이메일 회원가입
   */
  async signup(dto: SignupRequestDto): Promise<AuthResponseDto> {
    // 1. 비밀번호 확인 일치 검증
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다');
    }

    // 2. 필수 약관 동의 검증
    if (!dto.agreeTermsOfService || !dto.agreePrivacyPolicy) {
      throw new BadRequestException('필수 약관에 동의해야 합니다');
    }

    // 3. 이메일 중복 확인
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('이미 가입된 이메일입니다');
    }

    // 4. 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(
      dto.password,
      this.BCRYPT_SALT_ROUNDS,
    );

    // 5. 유저 생성
    const user = await this.usersService.createWithEmail({
      email: dto.email,
      hashedPassword,
      plannerNumber: dto.plannerNumber,
      agreements: {
        termsOfService: dto.agreeTermsOfService,
        privacyPolicy: dto.agreePrivacyPolicy,
        marketing: dto.agreeMarketing,
      },
    });

    // 6. JWT 토큰 발급 및 응답
    return this.generateAuthResponse(user);
  }

  /**
   * 이메일 로그인
   */
  async login(dto: LoginRequestDto): Promise<AuthResponseDto> {
    // 1. 유저 조회 (비밀번호 포함)
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다',
      );
    }

    // 2. 소셜 로그인 전용 계정인지 확인
    if (!user.password) {
      throw new UnauthorizedException(
        '소셜 로그인으로 가입된 계정입니다. 소셜 로그인을 이용해주세요.',
      );
    }

    // 3. 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다',
      );
    }

    // 4. 계정 활성 상태 확인
    if (!user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다');
    }

    // 5. 마지막 로그인 시간 업데이트
    await this.usersService.updateLastLogin(user.id);

    // 6. JWT 토큰 발급 및 응답
    return this.generateAuthResponse(user);
  }

  /**
   * 소셜 로그인 (Authorization Code 방식)
   */
  async socialLogin(
    dto: SocialLoginRequestDto,
  ): Promise<
    | AuthResponseDto
    | {
        needsAgreement: true;
        tempToken: string;
        email: string;
        nickname: string | null;
        profileImage: string | null;
      }
  > {
    // 1. Authorization Code를 Access Token으로 교환
    const tokenData = await this.exchangeCodeForToken(dto.provider, dto.code);

    // 2. Access Token으로 소셜 플랫폼에서 유저 정보 조회
    const socialProfile = await this.getSocialProfile(
      dto.provider,
      tokenData.accessToken,
    );

    // 3. 기존 소셜 계정으로 가입된 유저인지 확인
    let user = await this.usersService.findBySocialAccount(
      dto.provider,
      socialProfile.id,
    );

    if (user) {
      // 기존 유저: 바로 로그인
      await this.usersService.updateLastLogin(user.id);
      return this.generateAuthResponse(user);
    }

    // 4. 이메일로 기존 유저 확인 (다른 방식으로 가입했을 수 있음)
    const existingUser = await this.usersService.findByEmail(
      socialProfile.email,
    );

    if (existingUser) {
      // 기존 이메일 계정에 소셜 계정 연동
      await this.usersService.linkSocialAccount(existingUser.id, {
        provider: dto.provider,
        providerId: socialProfile.id,
        accessToken: tokenData.accessToken,
      });
      await this.usersService.updateLastLogin(existingUser.id);
      return this.generateAuthResponse(existingUser);
    }

    // 5. 신규 유저: 약관 동의 필요
    if (!dto.agreeTermsOfService || !dto.agreePrivacyPolicy) {
      // 약관 동의가 없으면 임시 토큰과 함께 약관 동의 요청
      const tempToken = this.jwtService.sign(
        {
          provider: dto.provider,
          providerId: socialProfile.id,
          email: socialProfile.email,
          nickname: socialProfile.nickname,
          profileImage: socialProfile.profileImage,
          accessToken: tokenData.accessToken,
        },
        { expiresIn: '10m' }, // 10분 유효
      );

      return {
        needsAgreement: true,
        tempToken,
        email: socialProfile.email,
        nickname: socialProfile.nickname,
        profileImage: socialProfile.profileImage,
      };
    }

    // 6. 신규 유저 생성
    user = await this.usersService.createWithSocial({
      email: socialProfile.email,
      nickname: socialProfile.nickname,
      profileImage: socialProfile.profileImage,
      provider: dto.provider,
      providerId: socialProfile.id,
      accessToken: tokenData.accessToken,
      agreements: {
        termsOfService: dto.agreeTermsOfService,
        privacyPolicy: dto.agreePrivacyPolicy,
        marketing: dto.agreeMarketing || false,
      },
    });

    return this.generateAuthResponse(user);
  }

  /**
   * 소셜 로그인 약관 동의 후 회원가입 완료
   */
  async completeSocialSignup(
    tempToken: string,
    agreements: {
      termsOfService: boolean;
      privacyPolicy: boolean;
      marketing: boolean;
    },
  ): Promise<AuthResponseDto> {
    // 1. 임시 토큰 검증
    let payload: {
      provider: SocialProvider;
      providerId: string;
      email: string;
      nickname: string | null;
      profileImage: string | null;
      accessToken: string;
    };

    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다');
    }

    // 2. 필수 약관 동의 검증
    if (!agreements.termsOfService || !agreements.privacyPolicy) {
      throw new BadRequestException('필수 약관에 동의해야 합니다');
    }

    // 3. 유저 생성
    const user = await this.usersService.createWithSocial({
      email: payload.email,
      nickname: payload.nickname,
      profileImage: payload.profileImage,
      provider: payload.provider,
      providerId: payload.providerId,
      accessToken: payload.accessToken,
      agreements,
    });

    return this.generateAuthResponse(user);
  }

  /**
   * 카카오 로그인 (Authorization Code 방식)
   * /auth/kakao/callback 엔드포인트에서 사용
   * - 기존 회원: 바로 로그인
   * - 신규 회원: needsSignup: true 반환 (회원가입 페이지로 이동)
   */
  async kakaoLogin(code: string): Promise<
    | { needsSignup: false; accessToken: string; refreshToken: string; user: UserResponseDto }
    | { needsSignup: true; socialProfile: any; provider: string; socialAccessToken: string }
  > {
    // 1. Authorization Code를 Access Token으로 교환
    const tokenData = await this.exchangeKakaoCode(code);

    // 2. Access Token으로 카카오에서 유저 정보 조회
    const socialProfile = await this.getKakaoProfile(tokenData.accessToken);

    // 3. 기존 소셜 계정으로 가입된 유저인지 확인
    const user = await this.usersService.findBySocialAccount(
      SocialProvider.KAKAO,
      socialProfile.id,
    );

    if (user) {
      // 기존 유저 (이 소셜 계정으로 가입한 유저): 바로 로그인
      await this.usersService.updateLastLogin(user.id);
      const authResponse = await this.generateAuthResponse(user);
      return {
        needsSignup: false,
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        user: authResponse.user,
      };
    }

    // 4. 신규 소셜 계정: 회원가입 필요 (약관 동의 화면으로 이동)
    // 이메일 중복 체크는 socialSignup에서 처리
    return {
      needsSignup: true,
      socialProfile: {
        id: socialProfile.id,
        email: socialProfile.email,
        nickname: socialProfile.nickname,
        profileImage: socialProfile.profileImage,
      },
      provider: 'kakao',
      socialAccessToken: tokenData.accessToken,
    };
  }

  /**
   * 구글 로그인 (Authorization Code 방식)
   * - 기존 회원: 바로 로그인
   * - 신규 회원: needsSignup: true 반환 (회원가입 페이지로 이동)
   */
  async googleLogin(code: string): Promise<
    | { needsSignup: false; accessToken: string; refreshToken: string; user: UserResponseDto }
    | { needsSignup: true; socialProfile: any; provider: string; socialAccessToken: string }
  > {
    // 1. Authorization Code를 Access Token으로 교환
    const tokenData = await this.exchangeGoogleCode(code);

    // 2. Access Token으로 구글에서 유저 정보 조회
    const socialProfile = await this.getGoogleProfile(tokenData.accessToken);

    // 3. 기존 소셜 계정으로 가입된 유저인지 확인
    const user = await this.usersService.findBySocialAccount(
      SocialProvider.GOOGLE,
      socialProfile.id,
    );

    if (user) {
      // 기존 유저 (이 소셜 계정으로 가입한 유저): 바로 로그인
      await this.usersService.updateLastLogin(user.id);
      const authResponse = await this.generateAuthResponse(user);
      return {
        needsSignup: false,
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        user: authResponse.user,
      };
    }

    // 4. 신규 소셜 계정: 회원가입 필요 (약관 동의 화면으로 이동)
    // 이메일 중복 체크는 socialSignup에서 처리
    return {
      needsSignup: true,
      socialProfile: {
        id: socialProfile.id,
        email: socialProfile.email,
        nickname: socialProfile.nickname,
        profileImage: socialProfile.profileImage,
      },
      provider: 'google',
      socialAccessToken: tokenData.accessToken,
    };
  }

  /**
   * 네이버 로그인 (Authorization Code 방식)
   * - 기존 회원: 바로 로그인
   * - 신규 회원: needsSignup: true 반환 (회원가입 페이지로 이동)
   */
  async naverLogin(code: string): Promise<
    | { needsSignup: false; accessToken: string; refreshToken: string; user: UserResponseDto }
    | { needsSignup: true; socialProfile: any; provider: string; socialAccessToken: string }
  > {
    // 1. Authorization Code를 Access Token으로 교환
    const tokenData = await this.exchangeNaverCode(code);

    // 2. Access Token으로 네이버에서 유저 정보 조회
    const socialProfile = await this.getNaverProfile(tokenData.accessToken);

    // 3. 기존 소셜 계정으로 가입된 유저인지 확인
    const user = await this.usersService.findBySocialAccount(
      SocialProvider.NAVER,
      socialProfile.id,
    );

    if (user) {
      // 기존 유저 (이 소셜 계정으로 가입한 유저): 바로 로그인
      await this.usersService.updateLastLogin(user.id);
      const authResponse = await this.generateAuthResponse(user);
      return {
        needsSignup: false,
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        user: authResponse.user,
      };
    }

    // 4. 신규 소셜 계정: 회원가입 필요 (약관 동의 화면으로 이동)
    // 이메일 중복 체크는 socialSignup에서 처리
    return {
      needsSignup: true,
      socialProfile: {
        id: socialProfile.id,
        email: socialProfile.email,
        nickname: socialProfile.nickname,
        profileImage: socialProfile.profileImage,
      },
      provider: 'naver',
      socialAccessToken: tokenData.accessToken,
    };
  }

  /**
   * 소셜 회원가입 (신규 유저용)
   * 프론트엔드에서 약관 동의 후 호출
   */
  async socialSignup(data: {
    provider: string;
    providerId: string;
    socialAccessToken: string;
    email?: string;
    nickname?: string;
    profileImage?: string;
    plannerNumber?: string;
    agreements: {
      termsOfService: boolean;
      privacyPolicy: boolean;
      marketing: boolean;
    };
  }): Promise<AuthResponseDto> {
    // provider 문자열을 SocialProvider enum으로 변환
    const providerEnum = data.provider.toLowerCase() as SocialProvider;
    if (!Object.values(SocialProvider).includes(providerEnum)) {
      throw new BadRequestException('지원하지 않는 소셜 로그인입니다');
    }

    // 이미 가입된 유저인지 확인 (소셜 계정 기준)
    const existingSocialUser = await this.usersService.findBySocialAccount(
      providerEnum,
      data.providerId,
    );
    if (existingSocialUser) {
      throw new BadRequestException('이미 가입된 계정입니다');
    }

    // 이메일이 없는 경우 에러
    if (!data.email) {
      throw new BadRequestException('이메일 정보가 필요합니다');
    }

    // 이메일 중복 확인
    const existingEmailUser = await this.usersService.findByEmail(data.email);
    if (existingEmailUser) {
      // 기존 이메일 계정에 소셜 계정 연동 후 로그인 처리
      await this.usersService.linkSocialAccount(existingEmailUser.id, {
        provider: providerEnum,
        providerId: data.providerId,
        accessToken: data.socialAccessToken,
      });
      await this.usersService.updateLastLogin(existingEmailUser.id);
      return this.generateAuthResponse(existingEmailUser);
    }

    // 신규 유저 생성
    const user = await this.usersService.createWithSocial({
      email: data.email,
      nickname: data.nickname,
      profileImage: data.profileImage,
      provider: providerEnum,
      providerId: data.providerId,
      accessToken: data.socialAccessToken,
      plannerNumber: data.plannerNumber,
      agreements: data.agreements,
    });

    return this.generateAuthResponse(user);
  }

  /**
   * JWT 토큰으로 유저 조회 (Guard에서 사용)
   */
  async validateUser(userId: string): Promise<User | null> {
    return this.usersService.findById(userId);
  }

  /**
   * Authorization Code를 Access Token으로 교환
   */
  private async exchangeCodeForToken(
    provider: SocialProvider,
    code: string,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    switch (provider) {
      case SocialProvider.GOOGLE:
        return this.exchangeGoogleCode(code);
      case SocialProvider.KAKAO:
        return this.exchangeKakaoCode(code);
      case SocialProvider.NAVER:
        return this.exchangeNaverCode(code);
      default:
        throw new BadRequestException('지원하지 않는 소셜 로그인입니다');
    }
  }

  /**
   * Google Authorization Code 교환
   */
  private async exchangeGoogleCode(
    code: string,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Google OAuth 설정이 완료되지 않았습니다');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new UnauthorizedException(
        `Google 토큰 교환 실패: ${error.error_description || error.error}`,
      );
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  /**
   * Kakao Authorization Code 교환
   */
  private async exchangeKakaoCode(
    code: string,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const clientId = this.configService.get<string>('KAKAO_CLIENT_ID');
    const clientSecret = this.configService.get<string>('KAKAO_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('KAKAO_CALLBACK_URL');

    if (!clientId || !redirectUri) {
      throw new BadRequestException('Kakao OAuth 설정이 완료되지 않았습니다');
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
    });

    // client_secret은 선택사항 (Kakao 앱 설정에 따라)
    if (clientSecret) {
      body.append('client_secret', clientSecret);
    }

    const response = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new UnauthorizedException(
        `Kakao 토큰 교환 실패: ${error.error_description || error.error}`,
      );
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  /**
   * Naver Authorization Code 교환
   */
  private async exchangeNaverCode(
    code: string,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const clientId = this.configService.get<string>('NAVER_CLIENT_ID');
    const clientSecret = this.configService.get<string>('NAVER_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Naver OAuth 설정이 완료되지 않았습니다');
    }

    const response = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new UnauthorizedException(
        `Naver 토큰 교환 실패: ${error.error_description || error.error}`,
      );
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  /**
   * 소셜 플랫폼 프로필 조회
   */
  private async getSocialProfile(
    provider: SocialProvider,
    accessToken: string,
  ): Promise<{
    id: string;
    email: string;
    nickname: string | null;
    profileImage: string | null;
  }> {
    switch (provider) {
      case SocialProvider.GOOGLE:
        return this.getGoogleProfile(accessToken);
      case SocialProvider.KAKAO:
        return this.getKakaoProfile(accessToken);
      case SocialProvider.NAVER:
        return this.getNaverProfile(accessToken);
      default:
        throw new BadRequestException('지원하지 않는 소셜 로그인입니다');
    }
  }

  /**
   * Google 프로필 조회
   */
  private async getGoogleProfile(accessToken: string) {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      throw new UnauthorizedException('Google 인증에 실패했습니다');
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      nickname: data.name || null,
      profileImage: data.picture || null,
    };
  }

  /**
   * Kakao 프로필 조회
   */
  private async getKakaoProfile(accessToken: string) {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Kakao 인증에 실패했습니다');
    }

    const data = await response.json();
    return {
      id: String(data.id),
      email: data.kakao_account?.email,
      nickname: data.properties?.nickname || null,
      profileImage: data.properties?.profile_image || null,
    };
  }

  /**
   * Naver 프로필 조회
   */
  private async getNaverProfile(accessToken: string) {
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Naver 인증에 실패했습니다');
    }

    const data = await response.json();
    const profile = data.response;
    return {
      id: profile.id,
      email: profile.email,
      nickname: profile.nickname || profile.name || null,
      profileImage: profile.profile_image || null,
    };
  }

  /**
   * 리프레시 토큰으로 새 토큰 발급
   */
  async refreshTokens(refreshToken: string): Promise<RefreshTokenResponseDto> {
    // 1. 토큰 해싱
    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // 2. 유저 조회 (리프레시 토큰으로)
    const user = await this.usersService.findByRefreshToken(hashedToken);
    if (!user) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다');
    }

    // 3. 새 토큰 발급 및 저장
    const tokens = await this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * 로그아웃 (리프레시 토큰 무효화)
   */
  async logout(userId: string): Promise<void> {
    await this.usersService.clearRefreshToken(userId);
  }

  /**
   * 토큰 생성 (액세스 + 리프레시)
   */
  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email };

    // 액세스 토큰 (짧은 유효기간)
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES,
    });

    // 리프레시 토큰 (랜덤 문자열)
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const hashedRefreshToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // 만료일 계산
    const refreshTokenExpires = new Date();
    refreshTokenExpires.setDate(refreshTokenExpires.getDate() + this.REFRESH_TOKEN_EXPIRES_DAYS);

    // DB에 해싱된 리프레시 토큰 저장
    await this.usersService.setRefreshToken(user.id, hashedRefreshToken, refreshTokenExpires);

    return { accessToken, refreshToken };
  }

  /**
   * 인증 응답 생성 (JWT 토큰 + 유저 정보)
   */
  private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(user);

    const userResponse: UserResponseDto = {
      id: user.id,
      userNumber: user.userNumber,
      email: user.email,
      nickname: user.nickname,
      profileImage: user.profileImage,
      role: user.role,
    };

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userResponse,
    };
  }

  /**
   * 비밀번호 찾기 (재설정 토큰 발급)
   * 실무에서는 이메일 발송 서비스와 연동합니다
   */
  async forgotPassword(
    dto: ForgotPasswordRequestDto,
  ): Promise<{ message: string; resetToken?: string; previewUrl?: string }> {
    const user = await this.usersService.findByEmail(dto.email);

    // 보안: 유저 존재 여부와 관계없이 동일한 응답
    if (!user) {
      return {
        message:
          '해당 이메일로 가입된 계정이 있다면 비밀번호 재설정 링크가 발송됩니다.',
      };
    }

    // 소셜 로그인 전용 계정 확인
    const userWithPassword = await this.usersService.findByEmailWithPassword(
      dto.email,
    );
    if (userWithPassword && !userWithPassword.password) {
      return {
        message:
          '해당 이메일로 가입된 계정이 있다면 비밀번호 재설정 링크가 발송됩니다.',
      };
    }

    // 토큰 생성 (32바이트 hex)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // 토큰 만료시간: 24시간
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.usersService.setPasswordResetToken(
      user.id,
      hashedToken,
      expires,
    );

    // 이메일 발송 (이메일이 없는 경우는 findByEmail에서 이미 걸러짐)
    const emailResult = await this.mailService.sendPasswordResetEmail(
      user.email!,
      resetToken,
    );

    // 개발환경: 토큰과 미리보기 URL 반환
    if (process.env.NODE_ENV !== 'production') {
      return {
        message: '비밀번호 재설정 링크가 발송되었습니다.',
        resetToken, // 개발용
        previewUrl: emailResult.previewUrl, // Ethereal 미리보기 URL
      };
    }

    return {
      message:
        '해당 이메일로 가입된 계정이 있다면 비밀번호 재설정 링크가 발송됩니다.',
    };
  }

  /**
   * 비밀번호 재설정
   */
  async resetPassword(
    dto: ResetPasswordRequestDto,
  ): Promise<{ message: string }> {
    // 비밀번호 확인 일치 검증
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다');
    }

    // 토큰 해싱하여 DB 조회
    const hashedToken = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const user = await this.usersService.findByPasswordResetToken(hashedToken);
    if (!user) {
      throw new NotFoundException('유효하지 않거나 만료된 토큰입니다');
    }

    // 새 비밀번호 해싱 및 저장
    const hashedPassword = await bcrypt.hash(
      dto.password,
      this.BCRYPT_SALT_ROUNDS,
    );

    await this.usersService.updatePassword(user.id, hashedPassword);

    return { message: '비밀번호가 성공적으로 변경되었습니다' };
  }
}

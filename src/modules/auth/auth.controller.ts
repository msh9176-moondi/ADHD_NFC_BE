import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '../users/entities';
import { AuthService } from './auth.service';
import { CurrentUser, Public } from './decorators';
import {
  AuthResponseDto,
  ForgotPasswordRequestDto,
  LoginRequestDto,
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
  ResetPasswordRequestDto,
  SignupRequestDto,
  SocialLoginRequestDto,
  UserResponseDto,
} from './dto';

/**
 * Auth Controller
 *
 * - Swagger 문서화를 위해 ApiTags, ApiOperation, ApiResponse 사용
 * - 인증이 필요한 엔드포인트는 @UseGuards(JwtAuthGuard) 적용
 * - @ApiBearerAuth()는 Swagger에서 토큰 입력 UI를 표시
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 이메일 회원가입
   */
  @Public()
  @Post('signup')
  @ApiOperation({ summary: '이메일 회원가입' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async signup(@Body() dto: SignupRequestDto): Promise<AuthResponseDto> {
    return this.authService.signup(dto);
  }

  /**
   * 이메일 로그인
   */
  @Public()
  @Post('login')
  @ApiOperation({ summary: '이메일 로그인' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(@Body() dto: LoginRequestDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * 소셜 로그인
   * 신규 유저면 needsAgreement: true와 tempToken을 반환
   */
  @Public()
  @Post('social')
  @ApiOperation({ summary: '소셜 로그인' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async socialLogin(@Body() dto: SocialLoginRequestDto) {
    return this.authService.socialLogin(dto);
  }

  /**
   * 소셜 로그인 약관 동의 후 회원가입 완료
   */
  @Public()
  @Post('social/complete')
  @ApiOperation({ summary: '소셜 로그인 회원가입 완료 (약관 동의 후)' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async completeSocialSignup(
    @Body()
    body: {
      tempToken: string;
      agreeTermsOfService: boolean;
      agreePrivacyPolicy: boolean;
      agreeMarketing: boolean;
    },
  ): Promise<AuthResponseDto> {
    return this.authService.completeSocialSignup(body.tempToken, {
      termsOfService: body.agreeTermsOfService,
      privacyPolicy: body.agreePrivacyPolicy,
      marketing: body.agreeMarketing,
    });
  }

  /**
   * 현재 로그인한 유저 정보 조회
   * (글로벌 JwtAuthGuard가 적용됨 - @Public() 없으면 자동 인증 필요)
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  getMe(@CurrentUser() user: User): UserResponseDto {
    return {
      id: user.id,
      userNumber: user.userNumber,
      email: user.email,
      nickname: user.nickname,
      profileImage: user.profileImage,
      role: user.role,
    };
  }

  /**
   * 소셜 로그인 URL 조회
   * 프론트엔드에서 이 URL로 리다이렉트하면 계정 선택 화면이 나옴
   */
  @Public()
  @Get('social-url/:provider')
  @ApiOperation({ summary: '소셜 로그인 URL 조회' })
  @ApiResponse({ status: 200, description: '소셜 로그인 URL' })
  getSocialLoginUrl(
    @Param('provider') provider: string,
  ): { url: string } {
    return { url: this.authService.getSocialLoginUrl(provider) };
  }

  /**
   * 카카오 OAuth 콜백 (POST - 프론트엔드에서 code 전달)
   */
  @Public()
  @Post('kakao/callback')
  @ApiOperation({ summary: '카카오 로그인 콜백' })
  @ApiResponse({ status: 200, description: '카카오 로그인 처리 결과' })
  async kakaoCallback(@Body() body: { code: string }) {
    return this.authService.kakaoLogin(body.code);
  }

  /**
   * 구글 OAuth 콜백 (POST - 프론트엔드에서 code 전달)
   */
  @Public()
  @Post('google/callback')
  @ApiOperation({ summary: '구글 로그인 콜백' })
  @ApiResponse({ status: 200, description: '구글 로그인 처리 결과' })
  async googleCallback(@Body() body: { code: string }) {
    return this.authService.googleLogin(body.code);
  }

  /**
   * 네이버 OAuth 콜백 (POST - 프론트엔드에서 code 전달)
   */
  @Public()
  @Post('naver/callback')
  @ApiOperation({ summary: '네이버 로그인 콜백' })
  @ApiResponse({ status: 200, description: '네이버 로그인 처리 결과' })
  async naverCallback(@Body() body: { code: string; state?: string }) {
    return this.authService.naverLogin(body.code);
  }

  /**
   * 소셜 회원가입 (신규 유저용)
   */
  @Public()
  @Post('social-signup')
  @ApiOperation({ summary: '소셜 회원가입' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async socialSignup(
    @Body()
    body: {
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
    },
  ): Promise<AuthResponseDto> {
    return this.authService.socialSignup(body);
  }

  /**
   * 비밀번호 찾기 (재설정 이메일 발송)
   */
  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: '비밀번호 찾기' })
  @ApiResponse({ status: 200, description: '비밀번호 재설정 링크 발송' })
  async forgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    return this.authService.forgotPassword(dto);
  }

  /**
   * 비밀번호 재설정
   */
  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: '비밀번호 재설정' })
  @ApiResponse({ status: 200, description: '비밀번호 변경 완료' })
  async resetPassword(@Body() dto: ResetPasswordRequestDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * 토큰 갱신
   */
  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '액세스 토큰 갱신' })
  @ApiResponse({ status: 200, type: RefreshTokenResponseDto })
  async refresh(
    @Body() dto: RefreshTokenRequestDto,
  ): Promise<RefreshTokenResponseDto> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  /**
   * 로그아웃 (리프레시 토큰 무효화)
   */
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logout(@CurrentUser() user: User): Promise<{ message: string }> {
    await this.authService.logout(user.id);
    return { message: '로그아웃되었습니다' };
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { SocialProvider } from '../../common/enums';

/**
 * 소셜 로그인 요청 DTO
 *
 * 실무 포인트:
 * - Authorization Code 방식 사용 (보안상 권장)
 * - 프론트엔드에서 code를 받아서 백엔드로 전송
 * - 백엔드에서 code를 accessToken으로 교환 후 프로필 조회
 * - 소셜 로그인 첫 시도 시 약관 동의가 필요
 * - 기존 유저면 약관 동의 없이 로그인
 */
export class SocialLoginRequestDto {
  @ApiProperty({ enum: SocialProvider, description: '소셜 로그인 제공자' })
  @IsEnum(SocialProvider)
  provider: SocialProvider;

  @ApiProperty({ description: 'OAuth Authorization Code' })
  @IsString()
  code: string;

  @ApiProperty({
    description: '서비스 이용약관 동의 (신규 유저만 필수)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  agreeTermsOfService?: boolean;

  @ApiProperty({
    description: '개인정보 처리방침 동의 (신규 유저만 필수)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  agreePrivacyPolicy?: boolean;

  @ApiProperty({
    description: '마케팅 및 광고 수신 동의 (선택)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  agreeMarketing?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Role } from '../../common/enums';

/**
 * 인증 응답에 포함될 유저 정보 DTO
 *
 * - password 등 민감 정보는 절대 응답에 포함하지 않는다.
 * - 클라이언트에서 필요한 최소한의 정보만 반환한다.
 */
export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: '고유 사용자 번호 (예: ADHD0001)', nullable: true })
  userNumber: string | null;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  nickname: string | null;

  @ApiProperty({ nullable: true })
  profileImage: string | null;

  @ApiProperty({ enum: Role })
  role: Role;
}

/**
 * 로그인/회원가입 성공 응답 DTO
 */
export class AuthResponseDto {
  @ApiProperty({ description: 'JWT 액세스 토큰 (1시간 유효)' })
  accessToken: string;

  @ApiProperty({ description: 'JWT 리프레시 토큰 (7일 유효)' })
  refreshToken: string;

  @ApiProperty({ description: '유저 정보' })
  user: UserResponseDto;
}

/**
 * 토큰 갱신 요청 DTO
 */
export class RefreshTokenRequestDto {
  @ApiProperty({ description: '리프레시 토큰' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

/**
 * 토큰 갱신 응답 DTO
 */
export class RefreshTokenResponseDto {
  @ApiProperty({ description: '새 JWT 액세스 토큰' })
  accessToken: string;

  @ApiProperty({ description: '새 JWT 리프레시 토큰' })
  refreshToken: string;
}

/**
 * 소셜 로그인 시 신규 유저인 경우 응답
 * 약관 동의가 필요함을 알림
 */
export class SocialLoginNeedsAgreementDto {
  @ApiProperty({ example: true })
  needsAgreement: boolean;

  @ApiProperty({
    description: '임시 토큰 (약관 동의 후 회원가입 완료 시 사용)',
  })
  tempToken: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  nickname: string | null;

  @ApiProperty({ nullable: true })
  profileImage: string | null;
}

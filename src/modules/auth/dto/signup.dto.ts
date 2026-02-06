import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * 회원가입 요청 DTO
 *
 * - 비밀번호 정규식: 최소 8자, 영문+숫자+특수문자 조합
 * - 약관 동의는 필수/선택 구분
 * - ApiProperty는 Swagger 문서화용
 */
export class SignupRequestDto {
  @ApiProperty({ example: 'user@example.com', description: '이메일 주소' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: '비밀번호 (8자 이상, 영문+숫자+특수문자)',
  })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]+$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다',
  })
  password: string;

  @ApiProperty({ example: 'Password123!', description: '비밀번호 확인' })
  @IsString()
  passwordConfirm: string;

  @ApiProperty({ example: true, description: '서비스 이용약관 동의 (필수)' })
  @IsBoolean()
  agreeTermsOfService: boolean;

  @ApiProperty({ example: true, description: '개인정보 처리방침 동의 (필수)' })
  @IsBoolean()
  agreePrivacyPolicy: boolean;

  @ApiProperty({
    example: false,
    description: '마케팅 및 광고 수신 동의 (선택)',
  })
  @IsBoolean()
  agreeMarketing: boolean;

  @ApiPropertyOptional({
    example: '#001',
    description: '플래너 고유 번호 (#으로 시작, 상품 구매 연동용, 선택)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#/, { message: '플래너 번호는 #으로 시작해야 합니다' })
  plannerNumber?: string;
}

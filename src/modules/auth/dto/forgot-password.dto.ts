import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

/**
 * 비밀번호 재설정 요청 DTO (이메일 전송)
 */
export class ForgotPasswordRequestDto {
  @ApiProperty({ example: 'user@example.com', description: '가입한 이메일 주소' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  email: string;
}

/**
 * 비밀번호 재설정 DTO (새 비밀번호 설정)
 */
export class ResetPasswordRequestDto {
  @ApiProperty({ description: '비밀번호 재설정 토큰' })
  @IsString({ message: '토큰이 필요합니다' })
  token: string;

  @ApiProperty({ example: 'NewPassword123!', description: '새 비밀번호 (8자 이상, 영문+숫자+특수문자)' })
  @IsString({ message: '비밀번호를 입력해주세요' })
  @MinLength(8, { message: '8자 이상 입력해주세요' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]+$/, {
    message: '영문, 숫자, 특수문자를 포함해주세요',
  })
  password: string;

  @ApiProperty({ example: 'NewPassword123!', description: '새 비밀번호 확인' })
  @IsString({ message: '비밀번호 확인을 입력해주세요' })
  passwordConfirm: string;
}

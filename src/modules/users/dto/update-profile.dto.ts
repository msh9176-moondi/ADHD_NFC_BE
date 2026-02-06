import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 프로필 수정 DTO
 * 모든 필드가 선택적 (원하는 필드만 수정 가능)
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '닉네임' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @ApiPropertyOptional({ description: '프로필 이미지 URL' })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiPropertyOptional({ description: '실명' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  realName?: string;

  @ApiPropertyOptional({ description: '연락처' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

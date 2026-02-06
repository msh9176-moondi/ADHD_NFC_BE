import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * NFC 카드 수정 요청 DTO
 */
export class UpdateNfcCardDto {
  @ApiPropertyOptional({
    description: '카드 별명',
    example: '개인 카드',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '카드 이름은 50자 이내여야 합니다' })
  cardName?: string;

  @ApiPropertyOptional({
    description: '활성화 상태',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

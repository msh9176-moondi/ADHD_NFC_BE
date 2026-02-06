import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * NFC 카드 등록 요청 DTO
 *
 * 실무 포인트:
 * - cardUid: NFC 카드에서 읽은 UID (hex string, 콜론 구분자 허용)
 * - cardName: 사용자가 구분하기 위한 이름 (선택)
 */
export class RegisterNfcCardDto {
  @ApiProperty({
    description: 'NFC 카드 UID (hex string)',
    example: '04:A3:B2:1F:5D:80:00',
  })
  @IsNotEmpty({ message: '카드 UID는 필수입니다' })
  @IsString()
  @Matches(/^[0-9A-Fa-f:]+$/, {
    message: '유효한 NFC 카드 UID 형식이 아닙니다',
  })
  cardUid: string;

  @ApiPropertyOptional({
    description: '카드 별명 (선택)',
    example: '회사 카드',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '카드 이름은 50자 이내여야 합니다' })
  cardName?: string;
}

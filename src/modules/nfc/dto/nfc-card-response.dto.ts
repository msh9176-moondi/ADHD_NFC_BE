import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * NFC 카드 응답 DTO
 */
export class NfcCardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: '카드 UID (마스킹 처리)' })
  cardUid: string;

  @ApiPropertyOptional({ description: '카드 별명' })
  cardName: string | null;

  @ApiProperty({ description: '활성화 상태' })
  isActive: boolean;

  @ApiPropertyOptional({ description: '마지막 사용 시간' })
  lastUsedAt: Date | null;

  @ApiProperty({ description: '등록 시간' })
  registeredAt: Date;
}

/**
 * NFC 카드 목록 응답 DTO
 */
export class NfcCardsListResponseDto {
  @ApiProperty({ type: [NfcCardResponseDto] })
  cards: NfcCardResponseDto[];

  @ApiProperty({ description: '총 등록된 카드 수' })
  total: number;
}

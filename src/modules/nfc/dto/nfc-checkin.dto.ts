import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class NfcCheckinDto {
  @ApiPropertyOptional({
    description: 'NFC 카드 UID (선택사항 - 없으면 로그인된 사용자 기준)',
    example: '04:A3:B2:1F:5D:80:00',
  })
  @IsString()
  @IsOptional()
  cardUid?: string;
}

export class NfcCheckinResponseDto {
  @ApiProperty({ description: '체크인 성공 여부' })
  success: boolean;

  @ApiProperty({ description: '오늘 이미 체크인 했는지 여부' })
  alreadyCheckedIn: boolean;

  @ApiProperty({ description: '지급된 코인 (이미 체크인 했으면 0)', example: 15 })
  coinsEarned: number;

  @ApiProperty({ description: '지급된 XP (이미 체크인 했으면 0)', example: 15 })
  xpEarned: number;

  @ApiProperty({ description: '총 누적 조회수', example: 42 })
  totalTagCount: number;

  @ApiProperty({ description: '메시지' })
  message: string;
}

export class NfcCheckinStatusResponseDto {
  @ApiProperty({ description: '오늘 체크인 했는지 여부' })
  checkedInToday: boolean;

  @ApiProperty({ description: '마지막 체크인 시간', nullable: true })
  lastCheckinAt: Date | null;

  @ApiProperty({ description: '총 누적 조회수', example: 42 })
  totalTagCount: number;
}

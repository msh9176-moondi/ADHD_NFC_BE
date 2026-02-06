import { ApiProperty } from '@nestjs/swagger';

export class GrowthTreeResponseDto {
  @ApiProperty({ description: '현재 XP (나무 성장용)', example: 150 })
  currentXp: number;

  @ApiProperty({ description: '현재 코인 잔액 (마켓 구매용)', example: 100 })
  coins: number;

  @ApiProperty({ description: '현재 레벨', example: 3 })
  level: number;

  @ApiProperty({ description: '다음 레벨까지 필요한 XP', example: 50 })
  xpToNextLevel: number;

  @ApiProperty({ description: '현재 레벨 진행률 (%)', example: 75 })
  progressPercent: number;

  @ApiProperty({ description: '나무 단계 (1-8)', example: 3 })
  treeStage: number;

  @ApiProperty({ description: '나무 단계 설명', example: '새싹이 자라고 있어요!!' })
  treeStageName: string;

  @ApiProperty({ description: '총 NFC 체크인 횟수', example: 15 })
  totalCheckins: number;

  @ApiProperty({ description: '이번 달 체크인 횟수', example: 5 })
  monthlyCheckins: number;

  @ApiProperty({ description: '오늘 체크인 여부', example: true })
  checkedInToday: boolean;
}

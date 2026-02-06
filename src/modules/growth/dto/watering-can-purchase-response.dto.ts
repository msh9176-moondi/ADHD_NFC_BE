import { ApiProperty } from '@nestjs/swagger';

export class WateringCanPurchaseResponseDto {
  @ApiProperty({ description: '구매 성공 여부', example: true })
  success: boolean;

  @ApiProperty({ description: '메시지', example: '물뿌리개로 나무에 물을 주었습니다!' })
  message: string;

  @ApiProperty({ description: '획득한 XP', example: 30 })
  xpGained: number;

  @ApiProperty({ description: '새로운 총 XP', example: 180 })
  newTotalXp: number;

  @ApiProperty({ description: '새로운 레벨', example: 3 })
  newLevel: number;
}

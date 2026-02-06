import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional } from 'class-validator';

export class UpdateTraitScoreDto {
  @ApiProperty({ example: 75, description: '집중 성향 점수 (0-100)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  attention?: number;

  @ApiProperty({ example: 60, description: '충동 성향 점수 (0-100)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  impulsive?: number;

  @ApiProperty({ example: 45, description: '복합 성향 점수 (0-100)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  complex?: number;

  @ApiProperty({ example: 80, description: '감정 성향 점수 (0-100)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  emotional?: number;

  @ApiProperty({ example: 55, description: '동기 성향 점수 (0-100)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  motivation?: number;

  @ApiProperty({ example: 70, description: '환경 성향 점수 (0-100)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  environment?: number;
}

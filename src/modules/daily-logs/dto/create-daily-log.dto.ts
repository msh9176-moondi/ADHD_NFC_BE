import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsArray,
  IsOptional,
  IsIn,
  IsDateString,
} from 'class-validator';

const MOOD_OPTIONS = ['excited', 'calm', 'sleepy', 'tired', 'angry'] as const;

/**
 * 루틴 이행 정도
 * 0: 거의 못함
 * 1: 조금 함
 * 2: 절반 정도
 * 3: 대부분 함
 * 4: 거의 다함
 */
export enum RoutineScore {
  ALMOST_NONE = 0,    // 거의 못함
  A_LITTLE = 1,       // 조금 함
  HALF = 2,           // 절반 정도
  MOST = 3,           // 대부분 함
  ALMOST_ALL = 4,     // 거의 다함
}

export class CreateDailyLogDto {
  @ApiProperty({
    description: '오늘 내 마음 (감정)',
    enum: MOOD_OPTIONS,
    example: 'calm',
  })
  @IsString()
  @IsIn(MOOD_OPTIONS)
  mood: string;

  @ApiProperty({
    description: '루틴 이행 정도',
    enum: RoutineScore,
    enumName: 'RoutineScore',
    example: RoutineScore.MOST,
  })
  @IsInt()
  @IsIn([0, 1, 2, 3, 4])
  routineScore: RoutineScore;

  @ApiProperty({
    description: '오늘 실행한 루틴 ID 배열',
    type: [String],
    example: ['water', 'walk', 'meditate'],
  })
  @IsArray()
  @IsString({ each: true })
  completedRoutines: string[];

  @ApiPropertyOptional({
    description: '오늘 나에게 한 마디',
    example: '오늘 물 마시기를 꾸준히 해서 뿌듯했다!',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: '기록 날짜 (YYYY-MM-DD), 미입력시 오늘',
    example: '2026-01-26',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}

import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MonthlyReportQueryDto {
  @ApiPropertyOptional({
    description: '조회할 연월 (YYYY-MM 형식). 미입력시 현재 월',
    example: '2026-02',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'yearMonth는 YYYY-MM 형식이어야 합니다' })
  yearMonth?: string;
}

export class ReportSummaryDto {
  @ApiProperty({ description: '감정과 실행의 연결 요약' })
  emotion_execution: string;

  @ApiProperty({ description: '회복 패턴 요약' })
  recovery: string;

  @ApiProperty({ description: '언어 변화 요약' })
  language_shift: string;

  @ApiProperty({ description: '유지력 요약' })
  retention: string;

  @ApiProperty({ description: '다음 달 전략 요약' })
  next_strategy: string;
}

export class ReportDetailSectionDto {
  @ApiProperty({ description: '상세 텍스트' })
  text: string;

  @ApiProperty({ description: '추천 액션 목록', type: [String] })
  actions: string[];
}

export class ReportDetailDto {
  @ApiProperty({ description: '감정과 실행의 연결 상세' })
  emotion_execution: ReportDetailSectionDto;

  @ApiProperty({ description: '회복 패턴 상세' })
  recovery: ReportDetailSectionDto;

  @ApiProperty({ description: '언어 변화 상세' })
  language_shift: ReportDetailSectionDto;

  @ApiProperty({ description: '유지력 상세' })
  retention: ReportDetailSectionDto;

  @ApiProperty({ description: '다음 달 전략 상세' })
  next_strategy: ReportDetailSectionDto;
}

export class MoodStatDto {
  @ApiProperty({ description: '감정 키' })
  mood: string;

  @ApiProperty({ description: '횟수' })
  count: number;

  @ApiProperty({ description: '비율 (%)' })
  percentage: number;
}

export class LanguageShiftDto {
  @ApiProperty({ description: '전반부 횟수' })
  first: number;

  @ApiProperty({ description: '후반부 횟수' })
  second: number;
}

export class ReportStatsDto {
  @ApiProperty({ description: '기록 일수' })
  recordDays: number;

  @ApiProperty({ description: '평균 이행률 (%)' })
  avgCompletionRate: number;

  @ApiProperty({ description: '상위 감정 목록', type: [MoodStatDto] })
  topMoods: MoodStatDto[];

  @ApiProperty({ description: '감정 분포' })
  moodDistribution: Record<string, number>;

  @ApiProperty({ description: '회복률 (%)' })
  recoveryRate: number;

  @ApiProperty({ description: '언어 변화 통계' })
  languageShift: {
    selfBlame: LanguageShiftDto;
    acceptance: LanguageShiftDto;
  };
}

export class MonthlyReportResponseDto {
  @ApiProperty({ description: '리포트 ID' })
  id: string;

  @ApiProperty({ description: '연월' })
  yearMonth: string;

  @ApiProperty({ description: '요약 데이터', type: ReportSummaryDto, nullable: true })
  summary: ReportSummaryDto | null;

  @ApiProperty({ description: '상세 데이터', type: ReportDetailDto, nullable: true })
  detail: ReportDetailDto | null;

  @ApiProperty({ description: '통계 데이터', type: ReportStatsDto, nullable: true })
  stats: ReportStatsDto | null;

  @ApiProperty({ description: '사용된 모델' })
  model: string | null;

  @ApiProperty({ description: '생성 일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정 일시' })
  updatedAt: Date;

  @ApiProperty({ description: '재생성 가능 횟수' })
  regenerateRemaining: number;

  @ApiProperty({ description: '데이터 부족 여부' })
  isDataInsufficient: boolean;
}

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AiMonthlyReport } from './entities/ai-monthly-report.entity';
import { DailyLog } from '../daily-logs/entities/daily-log.entity';
import { MonthlyReportResponseDto, ReportStatsDto } from './dto/monthly-report.dto';

// 자책 키워드
const SELF_BLAME_KEYWORDS = ['못했', '또', '왜', '망했', '한심', '자책', '후회', '문제'];
// 수용/회복 키워드
const ACCEPTANCE_KEYWORDS = ['괜찮', '그래도', '잘했', '해냈', '다시', '다음', '천천히'];

// 개인정보 마스킹 패턴
const MASKING_PATTERNS = [
  /\b[\w.-]+@[\w.-]+\.\w{2,}\b/g, // 이메일
  /\b01[0-9]-?\d{3,4}-?\d{4}\b/g, // 전화번호
  /\b\d{6}-?\d{7}\b/g, // 주민번호
];

const MAX_REGENERATE_PER_MONTH = 3;
const PROMPT_VERSION = 'v1.0';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(AiMonthlyReport)
    private readonly reportRepository: Repository<AiMonthlyReport>,
    @InjectRepository(DailyLog)
    private readonly dailyLogRepository: Repository<DailyLog>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 월간 리포트 조회 (캐시 또는 새로 생성)
   */
  async getMonthlyReport(userId: string, yearMonth?: string): Promise<MonthlyReportResponseDto> {
    const targetMonth = yearMonth || this.getCurrentYearMonth();
    this.logger.log(`월간 리포트 조회: userId=${userId}, yearMonth=${targetMonth}`);

    // 1. 기존 리포트 조회
    let report = await this.reportRepository.findOne({
      where: { userId, yearMonth: targetMonth },
    });

    // 2. 없거나, 기록이 0개인 경우 새로 생성 (새 기록이 추가되었을 수 있음)
    if (!report || (report.statsJson?.recordDays === 0)) {
      this.logger.log(`리포트 생성/갱신 필요: 기존 recordDays=${report?.statsJson?.recordDays ?? 'N/A'}`);
      report = await this.generateReport(userId, targetMonth, report);
    }

    return this.toResponseDto(report);
  }

  /**
   * 리포트 재생성
   */
  async regenerateReport(userId: string, yearMonth?: string): Promise<MonthlyReportResponseDto> {
    const targetMonth = yearMonth || this.getCurrentYearMonth();
    this.logger.log(`리포트 재생성 요청: userId=${userId}, yearMonth=${targetMonth}`);

    // 기존 리포트 조회
    const existingReport = await this.reportRepository.findOne({
      where: { userId, yearMonth: targetMonth },
    });

    // 재생성 횟수 체크
    if (existingReport && existingReport.regenerateCount >= MAX_REGENERATE_PER_MONTH) {
      throw new BadRequestException(
        `이번 달 재생성 횟수를 초과했습니다. (최대 ${MAX_REGENERATE_PER_MONTH}회)`,
      );
    }

    // 새로 생성
    const report = await this.generateReport(userId, targetMonth, existingReport);
    return this.toResponseDto(report);
  }

  /**
   * 리포트 생성 로직
   */
  private async generateReport(
    userId: string,
    yearMonth: string,
    existingReport?: AiMonthlyReport | null,
  ): Promise<AiMonthlyReport> {
    // 1. 해당 월 일일 기록 조회
    const logs = await this.getMonthlyLogs(userId, yearMonth);

    // 2. 통계 집계
    const stats = this.aggregateStats(logs, yearMonth);

    // 3. OpenAI API 호출
    const { summary, detail, model } = await this.callOpenAI(logs, stats);

    // 4. DB 저장
    if (existingReport) {
      // 업데이트
      existingReport.summaryJson = summary;
      existingReport.detailJson = detail;
      existingReport.statsJson = stats;
      existingReport.model = model;
      existingReport.promptVersion = PROMPT_VERSION;
      existingReport.regenerateCount += 1;
      return this.reportRepository.save(existingReport);
    } else {
      // 새로 생성
      const newReport = this.reportRepository.create({
        userId,
        yearMonth,
        summaryJson: summary,
        detailJson: detail,
        statsJson: stats,
        model,
        promptVersion: PROMPT_VERSION,
        regenerateCount: 0,
      });
      return this.reportRepository.save(newReport);
    }
  }

  /**
   * 해당 월의 일일 기록 조회
   */
  private async getMonthlyLogs(userId: string, yearMonth: string): Promise<DailyLog[]> {
    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = `${yearMonth}-01`;
    const endDate = `${yearMonth}-${new Date(year, month, 0).getDate()}`;

    this.logger.log(`[getMonthlyLogs] userId=${userId}, yearMonth=${yearMonth}`);
    this.logger.log(`[getMonthlyLogs] 조회 범위: ${startDate} ~ ${endDate}`);

    const logs = await this.dailyLogRepository.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    this.logger.log(`[getMonthlyLogs] 조회된 로그 수: ${logs.length}`);

    return logs;
  }

  /**
   * 통계 집계
   */
  private aggregateStats(logs: DailyLog[], yearMonth: string): ReportStatsDto {
    const recordDays = logs.length;

    // 감정 분포
    const moodCounts: Record<string, number> = {};
    logs.forEach((log) => {
      moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
    });

    // 상위 감정
    const topMoods = Object.entries(moodCounts)
      .map(([mood, count]) => ({
        mood,
        count,
        percentage: recordDays > 0 ? Math.round((count / recordDays) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // 평균 이행률 (routineScore 0~4를 0~100%로 변환)
    const avgCompletionRate =
      recordDays > 0
        ? Math.round(
            (logs.reduce((sum, log) => sum + (log.routineScore || 0), 0) / recordDays / 4) * 100,
          )
        : 0;

    // 회복 지표 계산
    const recoveryRate = this.calculateRecoveryRate(logs);

    // 언어 변화 분석
    const languageShift = this.analyzeLanguageShift(logs, yearMonth);

    return {
      recordDays,
      avgCompletionRate,
      topMoods,
      moodDistribution: moodCounts,
      recoveryRate,
      languageShift,
    };
  }

  /**
   * 회복률 계산
   * - low_day: routineScore <= 1 (0~4 스케일에서 30% 이하)
   * - recovery: 다음날 routineScore가 +1 이상 상승하거나 2 이상이면 회복
   */
  private calculateRecoveryRate(logs: DailyLog[]): number {
    let lowDays = 0;
    let recoveries = 0;

    for (let i = 0; i < logs.length - 1; i++) {
      const current = logs[i];
      const next = logs[i + 1];

      // 이행률 낮은 날 (30% 이하 = score 1 이하)
      if ((current.routineScore || 0) <= 1) {
        lowDays++;
        // 다음날 회복 여부
        const nextScore = next.routineScore || 0;
        const currentScore = current.routineScore || 0;
        if (nextScore >= currentScore + 1 || nextScore >= 2) {
          recoveries++;
        }
      }
    }

    return lowDays > 0 ? Math.round((recoveries / lowDays) * 100) : 0;
  }

  /**
   * 언어 변화 분석 (전반부 vs 후반부)
   */
  private analyzeLanguageShift(
    logs: DailyLog[],
    yearMonth: string,
  ): ReportStatsDto['languageShift'] {
    const midDay = 15;
    const firstHalf = logs.filter((log) => {
      const day = parseInt(log.date.split('-')[2], 10);
      return day <= midDay;
    });
    const secondHalf = logs.filter((log) => {
      const day = parseInt(log.date.split('-')[2], 10);
      return day > midDay;
    });

    const countKeywords = (logsArr: DailyLog[], keywords: string[]): number => {
      return logsArr.reduce((count, log) => {
        if (!log.note) return count;
        return count + keywords.filter((kw) => log.note?.includes(kw)).length;
      }, 0);
    };

    return {
      selfBlame: {
        first: countKeywords(firstHalf, SELF_BLAME_KEYWORDS),
        second: countKeywords(secondHalf, SELF_BLAME_KEYWORDS),
      },
      acceptance: {
        first: countKeywords(firstHalf, ACCEPTANCE_KEYWORDS),
        second: countKeywords(secondHalf, ACCEPTANCE_KEYWORDS),
      },
    };
  }

  /**
   * OpenAI API 호출
   */
  private async callOpenAI(
    logs: DailyLog[],
    stats: ReportStatsDto,
  ): Promise<{
    summary: AiMonthlyReport['summaryJson'];
    detail: AiMonthlyReport['detailJson'];
    model: string;
  }> {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!openaiApiKey) {
      this.logger.warn('OpenAI API Key가 설정되지 않았습니다. 기본 리포트를 생성합니다.');
      return this.generateDefaultReport(logs, stats);
    }

    try {
      // 개인정보 마스킹된 노트 목록
      const maskedNotes = logs
        .filter((log) => log.note)
        .map((log) => ({
          date: log.date,
          mood: log.mood,
          note: this.maskPersonalInfo(log.note || ''),
        }));

      const prompt = this.buildPrompt(stats, maskedNotes, logs.length < 3);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `당신은 ADHD를 가진 사용자의 월간 기록을 분석하는 따뜻한 관찰자입니다.
'의지'가 아닌 '난이도/환경/회복 설계' 관점에서 분석하세요.
반드시 지정된 JSON 형식으로만 응답하세요.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API 오류: ${response.status}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      return {
        summary: content.summary,
        detail: content.detail,
        model: 'gpt-4o-mini',
      };
    } catch (error) {
      this.logger.error('OpenAI API 호출 실패:', error);
      return this.generateDefaultReport(logs, stats);
    }
  }

  /**
   * OpenAI 프롬프트 생성
   */
  private buildPrompt(
    stats: ReportStatsDto,
    notes: { date: string; mood: string; note: string }[],
    isDataInsufficient: boolean,
  ): string {
    const insufficientWarning = isDataInsufficient
      ? '주의: 기록이 3일 미만으로 매우 적습니다. "데이터가 아직 적어 조심스러운 추정"이라는 톤을 포함해주세요.\n\n'
      : '';

    return `${insufficientWarning}다음은 이번 달 사용자의 ADHD 관련 기록 통계입니다:

## 통계
- 기록 일수: ${stats.recordDays}일
- 평균 이행률: ${stats.avgCompletionRate}%
- 주요 감정: ${stats.topMoods.map((m) => `${m.mood}(${m.percentage}%)`).join(', ')}
- 회복률: ${stats.recoveryRate}%
- 언어 변화:
  - 자책 키워드: 전반부 ${stats.languageShift.selfBlame.first}회 → 후반부 ${stats.languageShift.selfBlame.second}회
  - 수용 키워드: 전반부 ${stats.languageShift.acceptance.first}회 → 후반부 ${stats.languageShift.acceptance.second}회

## 사용자 메모 (일부)
${notes.slice(0, 10).map((n) => `- ${n.date} (${n.mood}): "${n.note}"`).join('\n')}

## 요청
아래 JSON 형식으로 분석 결과를 작성해주세요:

{
  "summary": {
    "emotion_execution": "감정과 실행의 연결에 대한 2-4문장 요약",
    "recovery": "회복 패턴에 대한 2-4문장 요약",
    "language_shift": "언어 변화에 대한 2-4문장 요약",
    "retention": "유지력에 대한 2-4문장 요약",
    "next_strategy": "다음 달 전략에 대한 2-4문장 요약"
  },
  "detail": {
    "emotion_execution": {
      "text": "감정과 실행의 연결에 대한 4-8문장 상세 분석",
      "actions": ["추천 액션 1", "추천 액션 2"]
    },
    "recovery": {
      "text": "회복 패턴에 대한 4-8문장 상세 분석",
      "actions": ["추천 액션 1", "추천 액션 2"]
    },
    "language_shift": {
      "text": "언어 변화에 대한 4-8문장 상세 분석",
      "actions": ["추천 액션 1", "추천 액션 2"]
    },
    "retention": {
      "text": "유지력에 대한 4-8문장 상세 분석",
      "actions": ["추천 액션 1", "추천 액션 2"]
    },
    "next_strategy": {
      "text": "다음 달 전략에 대한 4-8문장 상세 분석. 반드시 다음 3가지를 포함: 1) 루틴은 1개만 고정 2) 이행률이 낮은 날엔 루틴 줄이기 3) 저녁엔 기록 생략, NFC만",
      "actions": ["루틴은 1개만 고정하기", "이행률이 낮은 날엔 루틴 줄이기", "저녁엔 기록 생략, NFC만 태깅하기", "추가 액션"]
    }
  }
}`;
  }

  /**
   * 기본 리포트 생성 (OpenAI 실패 시)
   */
  private generateDefaultReport(
    logs: DailyLog[],
    stats: ReportStatsDto,
  ): {
    summary: AiMonthlyReport['summaryJson'];
    detail: AiMonthlyReport['detailJson'];
    model: string;
  } {
    const isInsufficient = logs.length < 3;
    const prefix = isInsufficient ? '아직 기록이 적어 조심스러운 추정이지만, ' : '';

    return {
      summary: {
        emotion_execution: `${prefix}이번 달 평균 이행률은 ${stats.avgCompletionRate}%였어요. 감정과 실행 사이의 관계를 더 살펴보면 좋겠어요.`,
        recovery: `${prefix}이행률이 낮았던 날 이후 회복률은 ${stats.recoveryRate}%였어요. 흔들려도 다시 돌아오는 힘이 있어요.`,
        language_shift: `${prefix}자기 대화의 변화를 관찰했어요. 전반부와 후반부의 언어 패턴이 달라지고 있어요.`,
        retention: `${prefix}총 ${stats.recordDays}일 기록을 남겼어요. 꾸준히 자신을 돌보고 있다는 신호예요.`,
        next_strategy: `다음 달에는 루틴 1개만 고정하고, 힘든 날엔 루틴을 줄여보세요. 저녁엔 NFC 태깅만으로도 충분해요.`,
      },
      detail: {
        emotion_execution: {
          text: `${prefix}이번 달 주요 감정은 ${stats.topMoods.map((m) => m.mood).join(', ')}였어요. 평균 이행률 ${stats.avgCompletionRate}%를 기록했는데, 이건 '의지'의 문제가 아니라 그날의 난이도 차이에 가까워요. 감정이 힘든 날에는 실행이 어려워지는 게 자연스러운 반응이에요. 중요한 건 그런 날에도 자신을 탓하지 않는 거예요.`,
          actions: [
            '감정이 힘든 날은 루틴 난이도를 낮춰보세요',
            '실행하지 못한 날도 기록만 남겨보세요',
          ],
        },
        recovery: {
          text: `${prefix}이행률이 낮았던 날 다음날 회복률은 ${stats.recoveryRate}%였어요. 흔들려도 다시 돌아오는 패턴이 보여요. 특히 '나에게 한마디'를 남긴 날에는 회복이 더 빨랐을 가능성이 있어요. 완벽하게 해내는 것보다 다시 시작하는 게 더 중요해요.`,
          actions: [
            '힘든 날 다음날은 가벼운 루틴으로 시작하세요',
            '짧은 메모라도 자신에게 한마디 남겨보세요',
          ],
        },
        language_shift: {
          text: `${prefix}자책 키워드는 전반부 ${stats.languageShift.selfBlame.first}회에서 후반부 ${stats.languageShift.selfBlame.second}회로 변화했어요. 수용 키워드는 전반부 ${stats.languageShift.acceptance.first}회에서 후반부 ${stats.languageShift.acceptance.second}회로 변화했어요. 실행보다 먼저, 자기 대화가 변하고 있을 수 있어요.`,
          actions: [
            '"그래도 괜찮아"라는 말을 의식적으로 사용해보세요',
            '자책하는 문장을 발견하면 부드럽게 바꿔써보세요',
          ],
        },
        retention: {
          text: `${prefix}이번 달 총 ${stats.recordDays}일 기록을 남겼어요. 실행이 흔들려도, 기록을 남긴다는 건 자신을 놓지 않았다는 신호예요. 매일 완벽할 필요 없어요. 기록만으로도 충분히 잘하고 있는 거예요.`,
          actions: [
            '기록 자체를 하나의 성취로 인정해주세요',
            '빈 날이 있어도 다음날 다시 시작하면 돼요',
          ],
        },
        next_strategy: {
          text: `다음 달 전략을 제안드려요. 첫째, 루틴은 1개만 고정하세요. 여러 개를 시도하면 오히려 부담이 돼요. 둘째, 이행률이 낮은 날엔 루틴을 줄이세요. 힘든 날에 더 많이 하려고 하면 악순환이 돼요. 셋째, 저녁엔 기록 생략하고 NFC 태깅만 하세요. 가벼운 접촉만으로도 연결이 유지돼요.`,
          actions: [
            '루틴은 1개만 고정하기',
            '이행률이 낮은 날엔 루틴 줄이기',
            '저녁엔 기록 생략, NFC만 태깅하기',
            '주 1회 자신의 패턴 돌아보기',
          ],
        },
      },
      model: 'default',
    };
  }

  /**
   * 개인정보 마스킹
   */
  private maskPersonalInfo(text: string): string {
    let masked = text;
    MASKING_PATTERNS.forEach((pattern) => {
      masked = masked.replace(pattern, '***');
    });
    return masked;
  }

  /**
   * 현재 연월 반환
   */
  private getCurrentYearMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Entity -> Response DTO 변환
   */
  private toResponseDto(report: AiMonthlyReport): MonthlyReportResponseDto {
    return {
      id: report.id,
      yearMonth: report.yearMonth,
      summary: report.summaryJson,
      detail: report.detailJson,
      stats: report.statsJson,
      model: report.model,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      regenerateRemaining: MAX_REGENERATE_PER_MONTH - report.regenerateCount,
      isDataInsufficient: (report.statsJson?.recordDays || 0) < 3,
    };
  }
}

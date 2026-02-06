import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyLog } from './entities/daily-log.entity';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';

@Injectable()
export class DailyLogsService {
  constructor(
    @InjectRepository(DailyLog)
    private readonly dailyLogRepository: Repository<DailyLog>,
  ) {}

  /**
   * 일일 리포트 생성/수정 (Upsert)
   * - 같은 날짜에 이미 기록이 있으면 업데이트 (최신 데이터로 덮어쓰기)
   * - race condition 방지를 위해 DB 레벨 upsert 사용
   */
  async create(userId: string, dto: CreateDailyLogDto): Promise<DailyLog> {
    const today = dto.date || new Date().toISOString().split('T')[0];

    console.log('[DailyLog] 저장 요청:', {
      userId,
      date: today,
      mood: dto.mood,
      routineScore: dto.routineScore,
      completedRoutines: dto.completedRoutines,
    });

    // Upsert: INSERT 또는 UPDATE (userId + date 기준)
    await this.dailyLogRepository.upsert(
      {
        userId,
        mood: dto.mood,
        routineScore: dto.routineScore,
        completedRoutines: dto.completedRoutines,
        note: dto.note || null,
        date: today,
      },
      {
        conflictPaths: ['userId', 'date'],
        skipUpdateIfNoValuesChanged: true,
      },
    );

    // upsert는 엔티티를 반환하지 않으므로 다시 조회
    const saved = await this.dailyLogRepository.findOneOrFail({
      where: { userId, date: today },
    });

    console.log('[DailyLog] 저장 완료:', saved);
    return saved;
  }

  /**
   * 특정 날짜의 리포트 조회
   */
  async findByDate(userId: string, date: string): Promise<DailyLog | null> {
    return this.dailyLogRepository.findOne({
      where: { userId, date },
    });
  }

  /**
   * 사용자의 리포트 목록 조회 (최근순)
   */
  async findByUser(
    userId: string,
    limit: number = 30,
    offset: number = 0,
  ): Promise<DailyLog[]> {
    return this.dailyLogRepository.find({
      where: { userId },
      order: { date: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * 사용자의 성장 통계 조회
   * - 루틴별 실행 횟수 (랭킹)
   * - 총 실행 횟수
   * - 연속 실행 일수 (스트릭)
   */
  async getStats(userId: string): Promise<{
    routineRanking: { routineId: string; count: number }[];
    totalExecutions: number;
    currentStreak: number;
    longestStreak: number;
    totalDays: number;
  }> {
    console.log('[DailyLog] getStats 호출, userId:', userId);

    // 모든 일일 기록 조회
    const logs = await this.dailyLogRepository.find({
      where: { userId },
      order: { date: 'DESC' },
    });

    console.log('[DailyLog] 조회된 로그 수:', logs.length);
    console.log('[DailyLog] 로그 데이터:', logs.map(l => ({
      date: l.date,
      completedRoutines: l.completedRoutines,
    })));

    // 루틴별 실행 횟수 계산
    const routineCountMap: Record<string, number> = {};
    let totalExecutions = 0;

    for (const log of logs) {
      if (log.completedRoutines && log.completedRoutines.length > 0) {
        for (const routineId of log.completedRoutines) {
          routineCountMap[routineId] = (routineCountMap[routineId] || 0) + 1;
          totalExecutions++;
        }
      }
    }

    // 루틴 랭킹 정렬 (많이 실행한 순)
    const routineRanking = Object.entries(routineCountMap)
      .map(([routineId, count]) => ({ routineId, count }))
      .sort((a, b) => b.count - a.count);

    console.log('[DailyLog] 루틴 랭킹 결과:', routineRanking);
    console.log('[DailyLog] 총 실행 횟수:', totalExecutions);

    // 연속 실행 일수 계산
    const { currentStreak, longestStreak } = this.calculateStreak(logs);

    return {
      routineRanking,
      totalExecutions,
      currentStreak,
      longestStreak,
      totalDays: logs.length,
    };
  }

  /**
   * 스트릭 계산 (연속 기록 일수)
   */
  private calculateStreak(logs: DailyLog[]): {
    currentStreak: number;
    longestStreak: number;
  } {
    if (logs.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // 날짜순 정렬 (최신순)
    const sortedLogs = [...logs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    // 현재 스트릭 계산 (오늘/어제부터 시작해야 함)
    const firstLogDate = new Date(sortedLogs[0].date);
    firstLogDate.setHours(0, 0, 0, 0);

    const diffFromToday = Math.floor(
      (today.getTime() - firstLogDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // 오늘 또는 어제 기록이 있어야 현재 스트릭으로 인정
    const isCurrentStreakActive = diffFromToday <= 1;

    for (const log of sortedLogs) {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);

      if (prevDate === null) {
        tempStreak = 1;
      } else {
        const diff = Math.floor(
          (prevDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diff === 1) {
          // 연속
          tempStreak++;
        } else {
          // 끊김
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }

      prevDate = logDate;
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    // 현재 스트릭은 오늘/어제부터 연속인 경우만
    if (isCurrentStreakActive) {
      currentStreak = tempStreak;
      // 현재 스트릭 재계산 (오늘/어제부터 연속된 일수만)
      currentStreak = 0;
      prevDate = null;
      for (const log of sortedLogs) {
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);

        if (prevDate === null) {
          const diffFromNow = Math.floor(
            (today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (diffFromNow <= 1) {
            currentStreak = 1;
            prevDate = logDate;
          } else {
            break;
          }
        } else {
          const diff = Math.floor(
            (prevDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (diff === 1) {
            currentStreak++;
            prevDate = logDate;
          } else {
            break;
          }
        }
      }
    }

    return { currentStreak, longestStreak };
  }
}

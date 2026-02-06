import { Column, Entity, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * AI 월간 리포트 Entity
 *
 * - 사용자의 월별 ADHD 패턴 분석 리포트
 * - OpenAI GPT를 통해 생성된 요약/상세 분석 저장
 * - 같은 달에는 캐시된 결과 반환 (재생성 가능)
 */
@Entity('ai_monthly_reports')
@Index(['userId', 'yearMonth'], { unique: true })
export class AiMonthlyReport extends BaseEntity {
  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  // 연월 (YYYY-MM 형식)
  @Column({
    type: 'varchar',
    length: 7,
    name: 'year_month',
  })
  yearMonth: string;

  // 요약 JSON
  @Column({
    type: 'jsonb',
    name: 'summary_json',
    nullable: true,
  })
  summaryJson: {
    emotion_execution: string;
    recovery: string;
    language_shift: string;
    retention: string;
    next_strategy: string;
  } | null;

  // 상세 JSON
  @Column({
    type: 'jsonb',
    name: 'detail_json',
    nullable: true,
  })
  detailJson: {
    emotion_execution: { text: string; actions: string[] };
    recovery: { text: string; actions: string[] };
    language_shift: { text: string; actions: string[] };
    retention: { text: string; actions: string[] };
    next_strategy: { text: string; actions: string[] };
  } | null;

  // 통계 JSON
  @Column({
    type: 'jsonb',
    name: 'stats_json',
    nullable: true,
  })
  statsJson: {
    recordDays: number;
    avgCompletionRate: number;
    topMoods: { mood: string; count: number; percentage: number }[];
    moodDistribution: Record<string, number>;
    recoveryRate: number;
    languageShift: {
      selfBlame: { first: number; second: number };
      acceptance: { first: number; second: number };
    };
  } | null;

  // 사용된 모델
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  model: string | null;

  // 프롬프트 버전
  @Column({
    type: 'varchar',
    length: 20,
    name: 'prompt_version',
    nullable: true,
  })
  promptVersion: string | null;

  // 재생성 횟수 (월별 제한용)
  @Column({
    type: 'int',
    name: 'regenerate_count',
    default: 0,
  })
  regenerateCount: number;
}

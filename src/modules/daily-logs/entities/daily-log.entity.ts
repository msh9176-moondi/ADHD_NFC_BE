import { Column, Entity, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * 일일 리포트 (Daily Log) Entity
 *
 * - 사용자가 매일 기록하는 감정, 루틴 이행도, 메모 등
 * - 하루에 하나의 리포트만 작성 가능 (date + userId unique)
 */
@Entity('daily_logs')
@Index(['userId', 'date'], { unique: true })
export class DailyLog extends BaseEntity {
  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  // 오늘 내 마음 (감정)
  @Column({
    type: 'varchar',
    length: 20,
  })
  mood: string;

  // 루틴 이행 정도 (0~4)
  @Column({
    type: 'int',
    name: 'routine_score',
    default: 0,
  })
  routineScore: number;

  // 오늘 실행한 루틴 ID 배열 (JSON)
  @Column({
    type: 'simple-json',
    name: 'completed_routines',
    nullable: true,
  })
  completedRoutines: string[];

  // 오늘 나에게 한 마디
  @Column({
    type: 'text',
    nullable: true,
  })
  note: string | null;

  // 기록 날짜 (YYYY-MM-DD)
  @Column({
    type: 'date',
  })
  date: string;
}

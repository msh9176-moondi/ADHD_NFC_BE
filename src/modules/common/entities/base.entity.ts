import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 공통 Base Entity
 *
 * - 모든 테이블에 공통으로 필요한 컬럼을 상속받아 사용
 * - UUID를 PK로 사용하면 보안상 유리합니다 (순차 ID 추측 불가)
 * - created_at, updated_at은 감사(Audit) 목적으로 필수
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

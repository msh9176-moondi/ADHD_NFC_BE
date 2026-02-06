import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('trait_scores')
export class TraitScore {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @Column({ type: 'int', default: 0 })
  attention: number;

  @Column({ type: 'int', default: 0 })
  impulsive: number;

  @Column({ type: 'int', default: 0 })
  complex: number;

  @Column({ type: 'int', default: 0 })
  emotional: number;

  @Column({ type: 'int', default: 0 })
  motivation: number;

  @Column({ type: 'int', default: 0 })
  environment: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

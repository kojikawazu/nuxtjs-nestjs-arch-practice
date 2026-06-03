import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { TaskStatus } from '@app/api-client';

/**
 * タスク（infrastructure 層）。status は enum カラムではなく varchar で持ち、
 * 値の正しさは契約由来の TaskStatus 型 + DTO バリデーションで担保する（SQLite 互換のため）。
 */
@Entity('tasks')
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'todo' })
  status!: TaskStatus;

  @Column({ type: 'datetime', nullable: true })
  dueDate!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

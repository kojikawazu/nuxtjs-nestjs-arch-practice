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
 * タスクの永続化エンティティ（infrastructure 層の詳細）。
 * status は enum カラムではなく varchar で持ち、値の正しさは契約由来の TaskStatus 型 +
 * DTO バリデーションで担保する（SQLite 互換のため）。
 *
 * ドメイン（Task）とは別物で、両者の変換は task.mapper.ts が担う。
 * これによりドメイン/アプリケーション層が TypeORM に依存しない（クリーンアーキテクチャ）。
 */
@Entity('tasks')
export class TaskOrmEntity {
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

  @Column({ type: 'datetime' })
  startDate!: Date;

  @Column({ type: 'datetime', nullable: true })
  endDate!: Date | null;

  // 関連 URL（任意・http/https）。スキーム検証は DTO で担保する。varchar でポータブル。
  @Column({ type: 'varchar', length: 2048, nullable: true })
  url!: string | null;

  // 添付画像の公開パス（例: "/uploads/<file>"）。varchar でポータブル（MySQL/SQLite 双方可）。
  @Column({ type: 'varchar', length: 512, nullable: true })
  imageUrl!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

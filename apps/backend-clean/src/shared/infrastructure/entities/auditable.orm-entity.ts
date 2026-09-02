import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 監査列（作成日時・更新日時）を持つ永続化エンティティの抽象ベースクラス。
 *
 * 値の生成は TypeORM のデコレーター（`@CreateDateColumn` / `@UpdateDateColumn`）に委ね、
 * アプリケーションコードでは代入しない。各 Entity が個別に再定義すると片方だけ
 * 素の `@Column({ type: 'timestamp' })` に退化する等のズレが起こりうるため、1 か所に集約する。
 *
 * feature 名にも Port にも依存しない永続化の共通基盤なので shared/ に置く。
 * ベースクラスに `@Entity()` は付けないため独自テーブルにはならず、継承先のテーブルに列として展開される。
 * TypeORM 組み込みの BaseEntity（Active Record 用）とは無関係。
 */
export abstract class AuditableOrmEntity {
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

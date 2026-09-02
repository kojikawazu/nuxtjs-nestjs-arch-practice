import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * リフレッシュトークン（ハッシュ化して保存）。
 * 平文は保存せず、検証時に SHA-256 ハッシュを timingSafeEqual で定数時間比較する。ローテーション時は行を置き換える。
 */
@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  tokenHash!: string;

  @Column({ type: 'datetime' })
  expiresAt!: Date;

  // AuditableEntity を継承せず createdAt だけを持つ。この行はローテーション時に
  // UPDATE ではなく DELETE + INSERT で置き換わるため、updatedAt は常に createdAt と同値になり
  // 情報を持たない（継承させると意味のない列がスキーマに増えるだけになる）。
  @CreateDateColumn()
  createdAt!: Date;
}

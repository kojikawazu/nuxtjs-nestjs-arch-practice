import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableOrmEntity } from '../../../../shared/infrastructure/entities/auditable.orm-entity';

/**
 * ユーザー（infrastructure 層・永続化の詳細）。
 * カラム型は MySQL / SQLite 双方で動くポータブルな型のみを使う。
 * createdAt / updatedAt は AuditableOrmEntity から継承する。
 */
@Entity('users')
export class UserOrmEntity extends AuditableOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 80 })
  displayName!: string;
}

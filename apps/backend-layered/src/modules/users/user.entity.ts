import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../common/entities/auditable.entity';

/**
 * ユーザー（infrastructure 層）。
 * カラム型は MySQL / SQLite 双方で動くポータブルな型のみを使う。
 * createdAt / updatedAt は AuditableEntity から継承する。
 */
@Entity('users')
export class UserEntity extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 80 })
  displayName!: string;
}

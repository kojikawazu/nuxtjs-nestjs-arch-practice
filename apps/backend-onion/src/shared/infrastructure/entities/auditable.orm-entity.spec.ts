import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { AuditableOrmEntity } from './auditable.orm-entity';
import { RefreshTokenOrmEntity } from '../../../modules/auth/infrastructure/entities/refresh-token.orm-entity';
import { TaskOrmEntity } from '../../../modules/tasks/infrastructure/entities/task.orm-entity';
import { UserOrmEntity } from '../../../modules/users/infrastructure/entities/user.orm-entity';

/**
 * 監査列の集約を固定するテスト（外部 I/O なし・TypeORM のメタデータのみ参照）。
 *
 * 監査列は「壊れても動いてしまう」種類の設定で、列が消えても INSERT は成功し
 * e2e も通ってしまう。ここでは「専用デコレーターで、ベースクラスに 1 度だけ宣言されている」
 * ことを構造として固定し、二重定義への逆戻りや素の `@Column` への退化を検出する。
 */
const columnsOf = (target: unknown) =>
  getMetadataArgsStorage().columns.filter((column) => column.target === target);

const auditColumnModes = ['createDate', 'updateDate', 'deleteDate'];

describe('AuditableOrmEntity（監査列の集約）', () => {
  it('正常系: createdAt / updatedAt を専用デコレーターで宣言している', () => {
    const modesByProperty = Object.fromEntries(
      columnsOf(AuditableOrmEntity).map((column) => [column.propertyName, column.mode]),
    );

    expect(modesByProperty).toEqual({ createdAt: 'createDate', updatedAt: 'updateDate' });
  });

  it.each([
    ['UserOrmEntity', UserOrmEntity],
    ['TaskOrmEntity', TaskOrmEntity],
  ])('正常系: %s は AuditableOrmEntity を継承する', (_name, entity) => {
    expect(entity.prototype).toBeInstanceOf(AuditableOrmEntity);
  });

  it.each([
    ['UserOrmEntity', UserOrmEntity],
    ['TaskOrmEntity', TaskOrmEntity],
  ])('準正常系: %s は監査列を自前で再宣言していない', (_name, entity) => {
    const redeclared = columnsOf(entity)
      .filter((column) => auditColumnModes.includes(column.mode))
      .map((column) => column.propertyName);

    expect(redeclared).toEqual([]);
  });

  // ローテーションは DELETE + INSERT なので updatedAt は常に createdAt と同値になり、
  // 継承させると意味のない列がスキーマに増えるだけになる（意図的に継承しない）
  it('準正常系: RefreshTokenOrmEntity は継承せず createdAt のみを持つ', () => {
    expect(RefreshTokenOrmEntity.prototype).not.toBeInstanceOf(AuditableOrmEntity);

    const modesByProperty = Object.fromEntries(
      columnsOf(RefreshTokenOrmEntity)
        .filter((column) => auditColumnModes.includes(column.mode))
        .map((column) => [column.propertyName, column.mode]),
    );

    expect(modesByProperty).toEqual({ createdAt: 'createDate' });
  });

  it('準正常系: 監査列を宣言するのはベースクラスだけ（他クラスに散っていない）', () => {
    const declaringTargets = getMetadataArgsStorage()
      .columns.filter((column) => auditColumnModes.includes(column.mode))
      .map((column) => column.target);

    expect(new Set(declaringTargets)).toEqual(new Set([AuditableOrmEntity, RefreshTokenOrmEntity]));
  });
});

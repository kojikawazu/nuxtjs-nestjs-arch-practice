import { Task } from '../../domain/entities/task';
import { DateRange } from '../../domain/value-objects/date-range';
import { TaskOrmEntity } from '../entities/task.orm-entity';

/** ORM エンティティ → ドメイン Task。 */
export function ormToDomain(orm: TaskOrmEntity): Task {
  return Task.fromState({
    id: orm.id,
    userId: orm.userId,
    title: orm.title,
    description: orm.description,
    status: orm.status,
    // 保存時に検証済みなので通常は失敗しない。ここで組み立てることで、
    // ドメインへ入った時点で「開始 ≤ 終了」が保証された状態になる。
    period: DateRange.of(orm.startDate, orm.endDate),
    url: orm.url,
    imageUrl: orm.imageUrl,
    createdAt: orm.createdAt,
    updatedAt: orm.updatedAt,
  });
}

/** ドメイン Task → ORM エンティティ（更新時の保存に使う。id を持つので save は UPDATE になる）。 */
export function domainToOrm(task: Task): TaskOrmEntity {
  const s = task.toState();
  const orm = new TaskOrmEntity();
  orm.id = s.id;
  orm.userId = s.userId;
  orm.title = s.title;
  orm.description = s.description;
  orm.status = s.status;
  orm.startDate = s.period.start;
  orm.endDate = s.period.end;
  orm.url = s.url;
  orm.imageUrl = s.imageUrl;
  orm.createdAt = s.createdAt;
  orm.updatedAt = s.updatedAt;
  return orm;
}

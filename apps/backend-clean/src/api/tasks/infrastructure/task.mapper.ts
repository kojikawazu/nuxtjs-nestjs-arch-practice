import { Task } from '../domain/task';
import { TaskOrmEntity } from './task.orm-entity';

/** ORM エンティティ → ドメイン Task。 */
export function ormToDomain(orm: TaskOrmEntity): Task {
  return Task.fromState({
    id: orm.id,
    userId: orm.userId,
    title: orm.title,
    description: orm.description,
    status: orm.status,
    startDate: orm.startDate,
    endDate: orm.endDate,
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
  orm.startDate = s.startDate;
  orm.endDate = s.endDate;
  orm.url = s.url;
  orm.imageUrl = s.imageUrl;
  orm.createdAt = s.createdAt;
  orm.updatedAt = s.updatedAt;
  return orm;
}

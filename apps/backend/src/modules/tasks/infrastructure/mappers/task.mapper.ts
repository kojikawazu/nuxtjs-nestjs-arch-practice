import { Task, type TaskDraft } from '../../domain/task';
import { TaskEntity } from '../entities/task.entity';

/**
 * ドメイン（Task / TaskDraft）と永続化スキーマ（TaskEntity）の相互変換（infrastructure 層）。
 *
 * 「同じデータでもドメインと DB では表現が違う」を吸収する一点に変換を集約する。
 * ここを境に、ドメインは ORM デコレータを知らずに済む。
 */
export const TaskMapper = {
  /** DB Entity → ドメイン。 */
  toDomain(entity: TaskEntity): Task {
    return Task.fromState({
      id: entity.id,
      userId: entity.userId,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      startDate: entity.startDate,
      endDate: entity.endDate,
      url: entity.url,
      imageUrl: entity.imageUrl,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  },

  /** 新規下書き → 挿入用の Entity 形（id・日時は DB が採番する）。 */
  draftToEntity(draft: TaskDraft): Partial<TaskEntity> {
    return {
      userId: draft.userId,
      title: draft.title,
      description: draft.description,
      status: draft.status,
      startDate: draft.startDate,
      endDate: draft.endDate,
      url: draft.url,
      imageUrl: null,
    };
  },

  /** 既存ドメイン → 更新用の Entity 形（id を保持して upsert させる）。 */
  toEntity(task: Task): TaskEntity {
    const entity = new TaskEntity();
    entity.id = task.id;
    entity.userId = task.userId;
    entity.title = task.title;
    entity.description = task.description;
    entity.status = task.status;
    entity.startDate = task.startDate;
    entity.endDate = task.endDate;
    entity.url = task.url;
    entity.imageUrl = task.imageUrl;
    entity.createdAt = task.createdAt;
    entity.updatedAt = task.updatedAt;
    return entity;
  },
};

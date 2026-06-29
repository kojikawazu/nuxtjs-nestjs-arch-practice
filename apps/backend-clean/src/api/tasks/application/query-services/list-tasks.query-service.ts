import { Inject, Injectable } from '@nestjs/common';
import { TASK_QUERY, type TaskQuery } from '../ports/task-query.port';
import type { TaskReadModel } from '../read-models/task.read-model';

/**
 * 自分のタスク一覧を取得する Query Service（CQRS の Query 側）。
 * 参照専用の {@link TaskQuery} にのみ依存し、ドメイン Task を経由せず Read Model を返す。
 */
@Injectable()
export class ListTasksQueryService {
  constructor(
    @Inject(TASK_QUERY)
    private readonly query: TaskQuery,
  ) {}

  execute(userId: string): Promise<TaskReadModel[]> {
    return this.query.listByUserId(userId);
  }
}

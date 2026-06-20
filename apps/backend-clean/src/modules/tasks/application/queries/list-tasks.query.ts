import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { TASK_QUERY, type TaskQuery } from '../ports/task-query.port';

/**
 * 自分のタスク一覧を取得する（CQRS の Query 側）。
 * 参照専用の {@link TaskQuery} にのみ依存し、ドメイン Task を経由しない。
 */
@Injectable()
export class ListTasksQuery {
  constructor(
    @Inject(TASK_QUERY)
    private readonly query: TaskQuery,
  ) {}

  execute(userId: string): Promise<TaskContract[]> {
    return this.query.listByUserId(userId);
  }
}

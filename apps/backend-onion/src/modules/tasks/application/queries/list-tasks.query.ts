import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { TASK_QUERY, type TaskQuery } from '../../domain/repositories/task-query';

/**
 * 自分のタスク一覧を取得する（CQRS の Query 側）。
 * 参照専用の {@link TaskQuery}（domain 契約）にのみ依存し、ドメイン Task を経由しない。
 */
@Injectable()
export class ListTasksQuery {
  constructor(
    @Inject(TASK_QUERY)
    private readonly query: TaskQuery,
  ) {}

  /**
   * userId のタスク一覧を返す（ドメイン Task を経由しない）。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @returns Promise<Task[]>（契約 Task[]。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  execute(userId: string): Promise<TaskContract[]> {
    return this.query.listByUserId(userId);
  }
}

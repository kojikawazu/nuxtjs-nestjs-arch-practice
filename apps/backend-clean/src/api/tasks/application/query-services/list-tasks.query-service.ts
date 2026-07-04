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

  /**
   * userId のタスク一覧を Read Model で返す（ドメイン Task を経由しない）。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @returns Promise<TaskReadModel[]>（= 契約 Task[]。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  execute(userId: string): Promise<TaskReadModel[]> {
    return this.query.listByUserId(userId);
  }
}

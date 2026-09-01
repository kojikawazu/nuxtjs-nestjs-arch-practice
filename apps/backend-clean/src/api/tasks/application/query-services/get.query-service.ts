import { Inject, Injectable } from '@nestjs/common';
import { TaskAccessDeniedError, TaskNotFoundError } from '../../domain/errors/task.errors';
import { TASK_QUERY, type TaskQuery } from '../ports/task-query.port';
import type { TaskReadModel } from '../read-models/task.read-model';

/**
 * 自分のタスクを 1 件取得する Query Service（CQRS の Query 側）。
 *
 * 参照専用の {@link TaskQuery} にのみ依存し、ドメイン Task を経由しない。
 * 所有判定（存在しない=404 / 非所有=403）はここで行う（書き込み側の TaskAccessService に相当）。
 */
@Injectable()
export class GetTaskQueryService {
  constructor(
    @Inject(TASK_QUERY)
    private readonly query: TaskQuery,
  ) {}

  /**
   * id で 1 件引き、owner を照合（不存在=404 / 非所有=403）して Read Model を返す。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param id - string（対象タスクの ID）
   * @returns Promise<TaskReadModel>（= 契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(userId: string, id: string): Promise<TaskReadModel> {
    const row = await this.query.findByIdWithOwner(id);
    if (!row) {
      throw new TaskNotFoundError();
    }
    if (row.ownerId !== userId) {
      throw new TaskAccessDeniedError();
    }
    return row.task;
  }
}

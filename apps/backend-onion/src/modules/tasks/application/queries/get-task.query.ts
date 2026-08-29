import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { TaskAccessDeniedError, TaskNotFoundError } from '../../domain/errors/task.errors';
import { TASK_QUERY, type TaskQuery } from '../../domain/repositories/task-query';

/**
 * 自分のタスクを 1 件取得する（CQRS の Query 側）。
 *
 * 参照専用の {@link TaskQuery}（domain 契約）にのみ依存し、ドメイン Task を経由しない。
 * 所有判定（存在しない=404 / 非所有=403）はここで行う（書き込み側の TaskAccessService に相当）。
 */
@Injectable()
export class GetTaskQuery {
  constructor(
    @Inject(TASK_QUERY)
    private readonly query: TaskQuery,
  ) {}

  /**
   * id で 1 件引き、owner を照合（不存在=404 / 非所有=403）して契約 Task を返す。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param id - string（対象タスクの ID）
   * @returns Promise<Task>（契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(userId: string, id: string): Promise<TaskContract> {
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

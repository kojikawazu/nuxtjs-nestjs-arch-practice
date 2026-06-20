import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { TaskAccessDeniedError, TaskNotFoundError } from '../../domain/task.errors';
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

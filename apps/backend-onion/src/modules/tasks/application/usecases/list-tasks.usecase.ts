import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { TASK_REPOSITORY, type TaskRepository } from '../../domain/repositories/task.repository';
import { toContractTask } from '../task.mapper';

/** 自分のタスク一覧を取得する（並び順は実装に委ねる）。 */
@Injectable()
export class ListTasksUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  async execute(userId: string): Promise<TaskContract[]> {
    const tasks = await this.tasks.listByUserId(userId);
    return tasks.map(toContractTask);
  }
}

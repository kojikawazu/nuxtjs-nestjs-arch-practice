import { Inject, Injectable } from '@nestjs/common';
import type { Task } from '../../domain/task';
import { TASK_REPOSITORY, type TaskRepositoryPort } from '../ports/task-repository.port';

/** 自分のタスク一覧を取得する（application 層のユースケース）。 */
@Injectable()
export class ListTasksUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepositoryPort,
  ) {}

  execute(userId: string): Promise<Task[]> {
    return this.tasks.findManyByUser(userId);
  }
}

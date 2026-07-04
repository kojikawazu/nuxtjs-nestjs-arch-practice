import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { Task } from '../../domain/task';
import type { CreateTaskInput } from '../inputs/create-task.input';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';
import { toContractTask } from '../task.mapper';

/** タスクを新規作成する（application 層のユースケース。Port と Input にのみ依存）。 */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  /**
   * ドメイン Task を draft（開始≤終了を検証）→ Repository へ保存 → 契約 Task に変換して返す。
   * @param input - CreateTaskInput（Controller が契約 TaskCreate から変換した Command）
   * @returns Promise<Task>（契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(input: CreateTaskInput): Promise<TaskContract> {
    const draft = Task.draft(input);
    const created = await this.tasks.create(draft);
    return toContractTask(created);
  }
}

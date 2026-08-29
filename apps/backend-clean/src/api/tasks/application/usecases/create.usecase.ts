import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import type { CreateTaskInput } from '../inputs/create.input';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';
import { toContractTask } from '../mappers/task.mapper';
import { CreateTaskValidator } from '../validators/create.validator';

/** タスクを新規作成する（application 層のユースケース。Port と Input にのみ依存）。 */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    private readonly validator: CreateTaskValidator,
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  /**
   * Validator で検証（開始≤終了）した NewTask を Repository へ保存し、契約 Task に変換して返す。
   * @param input - CreateTaskInput（Controller が契約 TaskCreate から変換した Command）
   * @returns Promise<Task>（契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(input: CreateTaskInput): Promise<TaskContract> {
    const draft = this.validator.execute(input);
    const created = await this.tasks.create(draft);
    return toContractTask(created);
  }
}

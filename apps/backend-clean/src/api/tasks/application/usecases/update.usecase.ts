import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import type { UpdateTaskInput } from '../inputs/update.input';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';
import { toContractTask } from '../mappers/task.mapper';
import { UpdateTaskValidator } from '../validators/update.validator';

/** 自分のタスクを部分更新する（指定フィールドのみ反映し、開始≤終了を再検証）。 */
@Injectable()
export class UpdateTaskUseCase {
  constructor(
    private readonly validator: UpdateTaskValidator,
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  /**
   * Validator がロード（不存在=404 / 非所有=403）・更新適用・検証まで済ませた Task を保存し、契約 Task を返す。
   * Validator が検証済み Task を返すため、ここで読み直さない（SELECT は 1 回）。
   * @param input - UpdateTaskInput（Controller が契約 TaskUpdate から変換した Command）
   * @returns Promise<Task>（契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(input: UpdateTaskInput): Promise<TaskContract> {
    const task = await this.validator.execute(input);
    const saved = await this.tasks.update(task);
    return toContractTask(saved);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import type { UpdateTaskInput } from '../inputs/update-task.input';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';
import { loadOwnedTask } from '../task-access';
import { toContractTask } from '../task.mapper';

/** 自分のタスクを部分更新する（指定フィールドのみ反映し、開始≤終了を再検証）。 */
@Injectable()
export class UpdateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  /**
   * 所有タスクをロード（不存在=404 / 非所有=403）→ 指定フィールドを適用（開始≤終了を再検証）→ 保存 → 契約 Task を返す。
   * @param input: UpdateTaskInput（Controller が契約 TaskUpdate から変換した Command）
   * @returns Promise<Task>（契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(input: UpdateTaskInput): Promise<TaskContract> {
    const task = await loadOwnedTask(this.tasks, input.userId, input.id);
    task.applyUpdate({
      title: input.title,
      description: input.description,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      url: input.url,
    });
    const saved = await this.tasks.update(task);
    return toContractTask(saved);
  }
}

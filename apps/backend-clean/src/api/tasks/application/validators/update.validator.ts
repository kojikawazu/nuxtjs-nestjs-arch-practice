import { Inject, Injectable } from '@nestjs/common';
import type { UpdateTaskInput } from '../inputs/update.input';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';
import { loadOwnedTask } from '../services/task-access';

/**
 * タスク更新の DryRun（検証のみ・保存しない）。
 *
 * 所有権（存在=404 / 非所有=403）を確認し、更新後に確定する値で開始≤終了を検証する
 * （domain の `applyUpdate` がマージ後の不変条件を検査する）。`update`（保存）は呼ばない。
 * ※ 検証ロジックは domain に委譲し、ここは「ロード→適用→保存しない」オーケストレーションのみ担う。
 */
@Injectable()
export class UpdateTaskValidator {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  /**
   * 所有タスクをロード（不存在=404 / 非所有=403）→ マージ後の値で開始≤終了を検証（保存しない）。
   * @param input - UpdateTaskInput（Controller が契約 TaskUpdate から変換した Command）
   * @returns Promise<void>（検証 NG は DomainError を throw）
   */
  async execute(input: UpdateTaskInput): Promise<void> {
    const task = await loadOwnedTask(this.tasks, input.userId, input.id);
    task.applyUpdate({
      title: input.title,
      description: input.description,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      url: input.url,
    });
  }
}

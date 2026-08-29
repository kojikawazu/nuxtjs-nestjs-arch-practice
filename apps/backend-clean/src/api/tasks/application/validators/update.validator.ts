import { Inject, Injectable } from '@nestjs/common';
import type { Task } from '../../domain/entities/task';
import type { UpdateTaskInput } from '../inputs/update.input';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';
import { loadOwnedTask } from '../services/task-access';

/**
 * タスク更新の業務ルール検証（保存はしない）。
 *
 * 所有権（存在=404 / 非所有=403）を確認し、更新後に確定する値で開始≤終了を検証する
 * （domain の `applyUpdate` がマージ後の不変条件を検査する）。`update`（保存）は呼ばない。
 * DryRun（`POST /tasks/{id}/validate`）と本登録（`PATCH /tasks/{id}`）の双方がここを通る**唯一の検証実体**。
 *
 * 検証済みの Task を返すのは、呼び出し側が同じ行を読み直さずに保存できるようにするため。
 * void にすると本登録パスで SELECT が 2 回走り、その間に他者更新が挟まると
 * 「検証した対象とは違う行を保存する」ことが起こりうる。
 */
@Injectable()
export class UpdateTaskValidator {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  /**
   * 所有タスクをロード（不存在=404 / 非所有=403）→ 更新を適用して開始≤終了を検証し、その Task を返す（保存しない）。
   * @param input - UpdateTaskInput（Controller が契約 TaskUpdate から変換した Command）
   * @returns Promise<Task>（更新適用済み・検証済みのドメイン Task。検証 NG は DomainError を throw）
   */
  async execute(input: UpdateTaskInput): Promise<Task> {
    const task = await loadOwnedTask(this.tasks, input.userId, input.id);
    task.applyUpdate({
      title: input.title,
      description: input.description,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      url: input.url,
    });
    return task;
  }
}

import { Injectable } from '@nestjs/common';
import type { Task } from '../../domain/entities/task';
import { TaskAccessService } from '../../domain/services/task-access.service';
import type { UpdateTaskInput } from '../inputs/update.input';

/**
 * タスク更新の業務ルール検証（保存はしない）。
 * ドメインサービス TaskAccessService で所有権（存在=404 / 非所有=403）を確認し、
 * 更新後に確定する値で開始≤終了を検証する（applyUpdate がマージ後の不変条件を検査する）。
 * UseCase はこの Validator を通してから保存するため、検証の実体はここ 1 か所に集まる。
 *
 * 検証済みの Task を返すのは、呼び出し側が同じ行を読み直さずに保存できるようにするため。
 * void にすると本登録パスで SELECT が 2 回走り、その間に他者更新が挟まると
 * 「検証した対象とは違う行を保存する」ことが起こりうる。
 */
@Injectable()
export class UpdateTaskValidator {
  constructor(private readonly access: TaskAccessService) {}

  /**
   * 所有タスクをロード（不存在=404 / 非所有=403）→ 更新を適用して開始≤終了を検証し、その Task を返す（保存しない）。
   * @param input - UpdateTaskInput（Controller が契約 TaskUpdate から変換した Command）
   * @returns Promise<Task>（更新適用済み・検証済みのドメイン Task。検証 NG は DomainError を throw）
   */
  async execute(input: UpdateTaskInput): Promise<Task> {
    const task = await this.access.loadOwned(input.userId, input.id);
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

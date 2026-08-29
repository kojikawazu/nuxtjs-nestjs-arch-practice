import { Injectable } from '@nestjs/common';
import type { Task } from '../../domain/entities/task';
import { TaskAccessService } from '../../domain/services/task-access.service';
import type { UpdateTaskDto } from '../../presentation/dto/update.dto';

/**
 * タスク更新の業務ルール検証（保存はしない）。
 * ドメインサービス TaskAccessService で所有権（存在=404 / 非所有=403）を確認し、
 * 更新後に確定する値で開始≤終了を検証する（applyUpdate がマージ後の不変条件を検査する）。
 * DryRun（`POST /tasks/{id}/validate`）と本登録（`PATCH /tasks/{id}`）の双方がここを通る**唯一の検証実体**。
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
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param id - string（対象タスクの ID）
   * @param dto - UpdateTaskDto（ZodValidationPipe 検証済み。= 契約 TaskUpdate）
   * @returns Promise<Task>（更新適用済み・検証済みのドメイン Task。検証 NG は DomainError を throw）
   */
  async execute(userId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.access.loadOwned(userId, id);
    task.applyUpdate({
      title: dto.title,
      description: dto.description,
      status: dto.status,
      startDate: dto.startDate !== undefined ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
      url: dto.url,
    });
    return task;
  }
}

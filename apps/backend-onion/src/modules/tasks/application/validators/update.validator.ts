import { Injectable } from '@nestjs/common';
import { TaskAccessService } from '../../domain/services/task-access.service';
import type { UpdateTaskDto } from '../../presentation/dto/update.dto';

/**
 * タスク更新の DryRun（検証のみ・保存しない）。
 * 所有権（存在=404 / 非所有=403）を確認し、更新後に確定する値で開始≤終了を検証する。
 * domain の applyUpdate でマージ後の不変条件を検査するが、update（保存）は呼ばない。
 */
@Injectable()
export class UpdateTaskValidator {
  constructor(private readonly access: TaskAccessService) {}

  /**
   * 所有タスクをロード（不存在=404 / 非所有=403）→ マージ後の値で開始≤終了を検証（保存しない）。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param id - string（対象タスクの ID）
   * @param dto - UpdateTaskDto（ZodValidationPipe 検証済み。= 契約 TaskUpdate）
   * @returns Promise<void>（検証 NG は DomainError を throw）
   */
  async execute(userId: string, id: string, dto: UpdateTaskDto): Promise<void> {
    const task = await this.access.loadOwned(userId, id);
    task.applyUpdate({
      title: dto.title,
      description: dto.description,
      status: dto.status,
      startDate: dto.startDate !== undefined ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
      url: dto.url,
    });
  }
}

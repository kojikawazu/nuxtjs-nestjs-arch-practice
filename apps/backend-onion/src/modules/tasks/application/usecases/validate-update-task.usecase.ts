import { Injectable } from '@nestjs/common';
import { TaskAccessService } from '../../domain/services/task-access.service';
import type { UpdateTaskDto } from '../../presentation/dto/update-task.dto';

/**
 * タスク更新の DryRun（検証のみ・保存しない）。
 * 所有権（存在=404 / 非所有=403）を確認し、更新後に確定する値で開始≤終了を検証する。
 * domain の applyUpdate でマージ後の不変条件を検査するが、update（保存）は呼ばない。
 */
@Injectable()
export class ValidateUpdateTaskUseCase {
  constructor(private readonly access: TaskAccessService) {}

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

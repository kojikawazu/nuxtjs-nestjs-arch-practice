import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from '../../infrastructure/task.entity';
import type { UpdateTaskDto } from '../../presentation/dto/update-task.dto';
import { assertDateOrder, findOwnedTask } from '../task.util';

/**
 * タスク更新の DryRun（検証のみ・保存しない）。
 * 所有権（存在=404 / 非所有=403）を確認し、更新後に確定する値で開始≤終了を検証する。
 */
@Injectable()
export class ValidateUpdateTaskUseCase {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
  ) {}

  async execute(userId: string, id: string, dto: UpdateTaskDto): Promise<void> {
    const entity = await findOwnedTask(this.tasks, userId, id);
    const startDate = dto.startDate !== undefined ? new Date(dto.startDate) : entity.startDate;
    const endDate =
      dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : entity.endDate;
    assertDateOrder(startDate, endDate);
  }
}

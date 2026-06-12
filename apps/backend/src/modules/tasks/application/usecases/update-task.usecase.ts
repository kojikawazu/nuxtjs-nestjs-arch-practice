import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Task } from '@app/api-client';
import { TaskEntity } from '../../infrastructure/task.entity';
import type { UpdateTaskDto } from '../../presentation/dto/update-task.dto';
import { assertDateOrder, findOwnedTask, toContractTask } from '../task.util';

/** 自分のタスクを部分更新する（指定フィールドのみ反映し、開始≤終了を再検証）。 */
@Injectable()
export class UpdateTaskUseCase {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
  ) {}

  async execute(userId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    const entity = await findOwnedTask(this.tasks, userId, id);
    if (dto.title !== undefined) entity.title = dto.title;
    if (dto.description !== undefined) entity.description = dto.description ?? null;
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.startDate !== undefined) entity.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) entity.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.url !== undefined) entity.url = dto.url ?? null;
    assertDateOrder(entity.startDate, entity.endDate);
    const saved = await this.tasks.save(entity);
    return toContractTask(saved);
  }
}

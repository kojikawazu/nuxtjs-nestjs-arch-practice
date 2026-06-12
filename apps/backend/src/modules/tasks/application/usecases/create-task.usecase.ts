import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Task } from '@app/api-client';
import { TaskEntity } from '../../infrastructure/task.entity';
import type { CreateTaskDto } from '../../presentation/dto/create-task.dto';
import { assertDateOrder, toContractTask } from '../task.util';

/** タスクを新規作成する（application 層のユースケース）。 */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
  ) {}

  async execute(userId: string, dto: CreateTaskDto): Promise<Task> {
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    assertDateOrder(startDate, endDate);
    const entity = this.tasks.create({
      userId,
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? 'todo',
      startDate,
      endDate,
      url: dto.url ?? null,
    });
    const saved = await this.tasks.save(entity);
    return toContractTask(saved);
  }
}

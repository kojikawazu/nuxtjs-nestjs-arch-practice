import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Task } from '@app/api-client';
import { TaskEntity } from '../../infrastructure/task.entity';
import type { CreateTaskDto } from '../../presentation/dto/create.dto';
import { assertDateOrder, toContractTask } from '../task.util';

/** タスクを新規作成する（application 層のユースケース）。 */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
  ) {}

  /**
   * 開始≤終了を検証 → Entity を作成して保存 → 契約 Task に変換して返す。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param dto - CreateTaskDto（ZodValidationPipe 検証済み。= 契約 TaskCreate）
   * @returns Promise<Task>（契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
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

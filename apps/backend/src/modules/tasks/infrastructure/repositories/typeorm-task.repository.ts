import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Task, TaskDraft } from '../../domain/task';
import type { TaskRepositoryPort } from '../../application/ports/task-repository.port';
import { TaskEntity } from '../entities/task.entity';
import { TaskMapper } from '../mappers/task.mapper';

/**
 * TaskRepositoryPort の TypeORM 実装（infrastructure 層）。
 * DB I/O をここに閉じ込め、入出力は TaskMapper でドメインへ正規化する。
 */
@Injectable()
export class TypeormTaskRepository implements TaskRepositoryPort {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
  ) {}

  async findManyByUser(userId: string): Promise<Task[]> {
    const rows = await this.tasks.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(TaskMapper.toDomain);
  }

  async findById(id: string): Promise<Task | null> {
    const entity = await this.tasks.findOne({ where: { id } });
    return entity ? TaskMapper.toDomain(entity) : null;
  }

  async create(draft: TaskDraft): Promise<Task> {
    // id・日時は DB に採番させる（create で id を持たせない）
    const entity = this.tasks.create(TaskMapper.draftToEntity(draft));
    const saved = await this.tasks.save(entity);
    return TaskMapper.toDomain(saved);
  }

  async update(task: Task): Promise<Task> {
    const saved = await this.tasks.save(TaskMapper.toEntity(task));
    return TaskMapper.toDomain(saved);
  }

  async deleteById(id: string): Promise<void> {
    await this.tasks.delete({ id });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { NewTask, Task } from '../../domain/entities/task';
import type { TaskRepository } from '../../domain/repositories/task.repository';
import { domainToOrm, ormToDomain } from '../mappers/task.mapper';
import { TaskOrmEntity } from '../entities/task.orm-entity';

/**
 * ドメインの TaskRepository 契約の TypeORM 実装（infrastructure 層・最外）。
 * ここだけが TypeORM を知り、ドメイン Task ↔ ORM エンティティの変換を行う。
 */
@Injectable()
export class TypeOrmTaskRepository implements TaskRepository {
  constructor(
    @InjectRepository(TaskOrmEntity)
    private readonly repo: Repository<TaskOrmEntity>,
  ) {}

  async findById(id: string): Promise<Task | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? ormToDomain(row) : null;
  }

  async listByUserId(userId: string): Promise<Task[]> {
    const rows = await this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return rows.map(ormToDomain);
  }

  async create(input: NewTask): Promise<Task> {
    const entity = this.repo.create({
      userId: input.userId,
      title: input.title,
      description: input.description,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      url: input.url,
    });
    const saved = await this.repo.save(entity);
    return ormToDomain(saved);
  }

  async update(task: Task): Promise<Task> {
    const saved = await this.repo.save(domainToOrm(task));
    return ormToDomain(saved);
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Task } from '@app/api-client';
import { TaskEntity } from './task.entity';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';

/**
 * タスクのユースケース（application 層）。
 * 所有者認可（自分のタスクのみ操作可）をここで担保する。DB I/O は Repository に委譲。
 */
@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
  ) {}

  async list(userId: string): Promise<Task[]> {
    const rows = await this.tasks.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(TasksService.toContractTask);
  }

  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
    const entity = this.tasks.create({
      userId,
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? 'todo',
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });
    const saved = await this.tasks.save(entity);
    return TasksService.toContractTask(saved);
  }

  /**
   * タスク作成の DryRun（検証のみ）。DTO 検証は ValidationPipe が済ませている前提で、
   * 新規作成には所有権などの追加業務ルールが無いため、保存せずに通過させる。
   */
  async validateCreate(_userId: string, _dto: CreateTaskDto): Promise<void> {
    // DTO 検証以外の業務ルールは無し。DB への書き込みは行わない。
  }

  async getById(userId: string, id: string): Promise<Task> {
    const entity = await this.findOwned(userId, id);
    return TasksService.toContractTask(entity);
  }

  async update(userId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    const entity = await this.findOwned(userId, id);
    if (dto.title !== undefined) entity.title = dto.title;
    if (dto.description !== undefined) entity.description = dto.description ?? null;
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.dueDate !== undefined) entity.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    const saved = await this.tasks.save(entity);
    return TasksService.toContractTask(saved);
  }

  /**
   * タスク更新の DryRun（検証のみ）。所有権（存在=404 / 非所有=403）を確認するが、
   * 値の反映・保存（save）は行わない。
   */
  async validateUpdate(userId: string, id: string, _dto: UpdateTaskDto): Promise<void> {
    await this.findOwned(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const entity = await this.findOwned(userId, id);
    await this.tasks.delete({ id: entity.id });
  }

  /** 存在しなければ 404、他人のタスクなら 403。 */
  private async findOwned(userId: string, id: string): Promise<TaskEntity> {
    const entity = await this.tasks.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Task not found');
    }
    if (entity.userId !== userId) {
      throw new ForbiddenException('You do not own this task');
    }
    return entity;
  }

  private static toContractTask(entity: TaskEntity): Task {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description ?? undefined,
      status: entity.status,
      dueDate: entity.dueDate ? entity.dueDate.toISOString() : undefined,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

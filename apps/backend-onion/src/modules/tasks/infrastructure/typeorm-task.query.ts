import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Task as TaskContract } from '@app/api-client';
import type { TaskQuery } from '../domain/repositories/task-query';
import { TaskOrmEntity } from './task.orm-entity';

/**
 * ORM 行 → 契約 Task への **直接射影**（読み取り専用）。
 * 書き込み側の ORM→domain→contract（2 段）と異なり、ドメイン Task を作らず 1 段で変換する。
 */
function ormToContractTask(orm: TaskOrmEntity): TaskContract {
  return {
    id: orm.id,
    title: orm.title,
    description: orm.description ?? undefined,
    status: orm.status,
    startDate: orm.startDate.toISOString(),
    endDate: orm.endDate ? orm.endDate.toISOString() : undefined,
    url: orm.url ?? undefined,
    imageUrl: orm.imageUrl ?? undefined,
    createdAt: orm.createdAt.toISOString(),
    updatedAt: orm.updatedAt.toISOString(),
  };
}

/**
 * TaskQuery 契約の TypeORM 実装（CQRS の Query 側・infrastructure 層）。
 * 参照に特化し、ドメインを経由せず契約形を返す。
 */
@Injectable()
export class TypeOrmTaskQuery implements TaskQuery {
  constructor(
    @InjectRepository(TaskOrmEntity)
    private readonly repo: Repository<TaskOrmEntity>,
  ) {}

  async listByUserId(userId: string): Promise<TaskContract[]> {
    const rows = await this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return rows.map(ormToContractTask);
  }

  async findByIdWithOwner(id: string): Promise<{ task: TaskContract; ownerId: string } | null> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      return null;
    }
    return { task: ormToContractTask(row), ownerId: row.userId };
  }
}

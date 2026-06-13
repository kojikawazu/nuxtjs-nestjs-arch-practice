import { Inject, Injectable } from '@nestjs/common';
import type { Task } from '../task';
import { TaskNotFoundError } from '../task.errors';
import { TASK_REPOSITORY, type TaskRepository } from '../repositories/task.repository';

/**
 * 所有タスクの取得＋認可を担うドメインサービス（オニオンの「ドメインサービス」リング）。
 *
 * 単一エンティティに収まらない業務ルール（リポジトリ越しの取得 + 所有チェック）を
 * ドメイン中核に置く。リポジトリ契約（domain）にのみ依存し、フレームワーク/DB は知らない。
 * application 層の各ユースケースはこのサービスを再利用する。
 */
@Injectable()
export class TaskAccessService {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  /** 存在しなければ TaskNotFoundError、非所有なら（エンティティの）TaskAccessDeniedError。 */
  async loadOwned(userId: string, id: string): Promise<Task> {
    const task = await this.tasks.findById(id);
    if (!task) {
      throw new TaskNotFoundError();
    }
    task.assertOwnedBy(userId);
    return task;
  }
}

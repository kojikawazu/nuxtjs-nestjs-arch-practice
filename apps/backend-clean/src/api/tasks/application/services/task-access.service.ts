import { Inject, Injectable } from '@nestjs/common';
import type { Task } from '../../domain/entities/task';
import { TaskNotFoundError } from '../../domain/errors/task.errors';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';

/**
 * 所有タスクの取得＋認可を担うドメインサービス。
 *
 * 単一エンティティに収まらない業務ルール（リポジトリ越しの取得 + 所有チェック）をまとめ、
 * 書き込み側の UseCase / Validator が注入して再利用する。Port（TaskRepository）にのみ依存し、
 * TypeORM は知らない。
 *
 * **application に置くのがクリーン版の特徴**: 取得に Port が要る以上、Port を
 * `application/ports/` に置く clean ではこのサービスも application 側に居るしかない
 * （domain から application を見ることになるため domain には置けない）。
 * 契約を domain 中核が所有する onion 版は、同じ責務を `domain/services/` に置く。
 * → clean と onion の比較軸そのもの（形は同じ・所在だけが違う）。
 */
@Injectable()
export class TaskAccessService {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  /**
   * 所有タスクを 1 件ロードする。
   * @param userId - 所有者として期待するユーザー ID（@CurrentUser 由来）
   * @param id - 対象タスクの ID
   * @returns 該当のドメイン Task。存在しなければ TaskNotFoundError、非所有なら（エンティティの）TaskAccessDeniedError
   */
  async loadOwned(userId: string, id: string): Promise<Task> {
    const task = await this.tasks.findById(id);
    if (!task) {
      throw new TaskNotFoundError();
    }
    task.assertOwnedBy(userId);
    return task;
  }
}

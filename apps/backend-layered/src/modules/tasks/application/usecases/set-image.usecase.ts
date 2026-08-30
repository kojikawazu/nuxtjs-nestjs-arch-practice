import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Task } from '@app/api-client';
import { TaskEntity } from '../../infrastructure/task.entity';
import { findOwnedTask, removeStoredFile, saveImageFile, toContractTask } from '../task.util';

/**
 * タスクに画像を添付（1 枚・差し替え）する。
 * 所有権を確認 → サーバ生成名で保存 → imageUrl 更新 → 保存確定後に旧ファイルを掃除。
 * 保存に失敗した場合は、直前に書いた新ファイルを消してから元のエラーを投げ直す。
 */
@Injectable()
export class SetTaskImageUseCase {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
    private readonly config: ConfigService,
  ) {}

  /**
   * findOwnedTask で所有 Entity をロード → サーバ生成名で保存 → imageUrl 更新 → 保存確定後に旧ファイルを掃除。
   * 保存に失敗したら新ファイルを補償削除し、元のエラーを投げ直す（孤立ファイルを残さない）。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param id - string（対象タスクの ID）
   * @param file - Express.Multer.File（multipart の file フィールド）
   * @returns Promise<Task>（imageUrl 入りの契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(userId: string, id: string, file: Express.Multer.File): Promise<Task> {
    const entity = await findOwnedTask(this.tasks, userId, id);
    const dir = this.config.getOrThrow<string>('upload.dir');
    const previous = entity.imageUrl;

    entity.imageUrl = await saveImageFile(dir, entity.id, file);
    const saved = await this.tasks.save(entity).catch(async (error: unknown) => {
      // 保存に失敗したら、直前に書いた新ファイルを消す。ここを補償しないと
      // どこからも参照されないファイルがストレージに残り続ける（削除と違い、
      // 添付は imageUrl を決めるためにファイル生成が先に要るので順序を逆にできない）。
      // 元のエラーをそのまま投げ直す（原因が「保存に失敗した」から「掃除に失敗した」へ
      // すり替わると調査が迷子になる）。removeStoredFile は具体 util で内部が既に
      // 掃除の失敗を握りつぶすため、ここで catch を重ねない
      // （clean / onion は Port 越しで実装が投げない保証が無いため、呼び出し側で握りつぶす）。
      await removeStoredFile(dir, entity.imageUrl);
      throw error;
    });
    // 保存が確定してから旧ファイルを掃除する（失敗しても本処理は成功扱い）
    await removeStoredFile(dir, previous);
    return toContractTask(saved);
  }
}

import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Task } from '@app/api-client';
import { TaskEntity } from '../infrastructure/task.entity';

/**
 * tasks ユースケース群が共有するヘルパー（application 層）。
 *
 * レイヤード+UseCase 構成のため、認可・日付検証・契約変換・画像 I/O といった
 * 横断的な小処理をここに集約し、各 UseCase からは本筋（手順）だけが読めるようにする。
 */

/** MIME → 拡張子。許可外は 400。 */
export const EXT_BY_MIME: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** 存在しなければ 404、他人のタスクなら 403。 */
export async function findOwnedTask(
  repo: Repository<TaskEntity>,
  userId: string,
  id: string,
): Promise<TaskEntity> {
  const entity = await repo.findOne({ where: { id } });
  if (!entity) {
    throw new NotFoundException('Task not found');
  }
  if (entity.userId !== userId) {
    throw new ForbiddenException('You do not own this task');
  }
  return entity;
}

/** 開始・終了が両方あるとき、終了が開始より前なら 400。 */
export function assertDateOrder(start: Date, end: Date | null): void {
  if (end && end.getTime() < start.getTime()) {
    throw new BadRequestException('endDate must be on or after startDate');
  }
}

/** サーバ生成名（taskId + uuid）で画像を保存し、公開パスを返す。許可外 MIME は 400。 */
export async function saveImageFile(
  dir: string,
  taskId: string,
  file: Express.Multer.File,
): Promise<string> {
  const ext = EXT_BY_MIME[file.mimetype];
  if (!ext) {
    throw new BadRequestException('Unsupported image type');
  }
  await mkdir(dir, { recursive: true });
  // クライアント由来でなくサーバ生成名（パストラバーサル防止）
  const filename = `${taskId}-${randomUUID()}.${ext}`;
  await writeFile(join(dir, filename), file.buffer);
  return `/uploads/${filename}`;
}

/** 公開パス（"/uploads/<file>"）の実体を削除する（basename のみ使用・無ければ無視）。 */
export async function removeStoredFile(dir: string, publicPath: string | null): Promise<void> {
  if (!publicPath) return;
  try {
    await unlink(join(dir, basename(publicPath)));
  } catch {
    // 既に無い等は無視（掃除の失敗で本処理を巻き戻さない）
  }
}

/** Entity → API 契約形（@app/api-client の Task）。未設定（null）は契約上の省略（undefined）に。 */
export function toContractTask(entity: TaskEntity): Task {
  return {
    id: entity.id,
    title: entity.title,
    description: entity.description ?? undefined,
    status: entity.status,
    startDate: entity.startDate.toISOString(),
    endDate: entity.endDate ? entity.endDate.toISOString() : undefined,
    url: entity.url ?? undefined,
    imageUrl: entity.imageUrl ?? undefined,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

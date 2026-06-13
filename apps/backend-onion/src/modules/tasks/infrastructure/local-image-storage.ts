import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ImageFile, ImageStorage } from '../domain/services/image-storage';
import { UnsupportedImageTypeError } from '../domain/task.errors';

/** 許可する MIME → 拡張子。許可外は UnsupportedImageTypeError。 */
const EXT_BY_MIME: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * ドメインの ImageStorage 契約のローカルファイルシステム実装（infrastructure 層・最外）。
 * 保存先 `upload.dir` は ConfigService 経由（compose では volume）。
 */
@Injectable()
export class LocalImageStorage implements ImageStorage {
  constructor(private readonly config: ConfigService) {}

  private get dir(): string {
    return this.config.getOrThrow<string>('upload.dir');
  }

  async save(taskId: string, file: ImageFile): Promise<string> {
    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) {
      throw new UnsupportedImageTypeError();
    }
    const dir = this.dir;
    await mkdir(dir, { recursive: true });
    // クライアント由来でなくサーバ生成名（パストラバーサル防止）
    const filename = `${taskId}-${randomUUID()}.${ext}`;
    await writeFile(join(dir, filename), file.buffer);
    return `/uploads/${filename}`;
  }

  async remove(publicPath: string | null): Promise<void> {
    if (!publicPath) return;
    try {
      await unlink(join(this.dir, basename(publicPath)));
    } catch {
      // 既に無い等は無視（掃除の失敗で本処理を巻き戻さない）
    }
  }
}

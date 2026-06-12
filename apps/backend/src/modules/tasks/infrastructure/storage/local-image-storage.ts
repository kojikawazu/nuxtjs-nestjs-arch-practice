import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnsupportedImageTypeError } from '../../domain/task-errors';
import type { ImageStoragePort, UploadedImage } from '../../application/ports/image-storage.port';

/** MIME → 拡張子。許可外は UnsupportedImageTypeError。 */
const EXT_BY_MIME: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * ImageStoragePort のローカルファイルシステム実装（infrastructure 層）。
 * 保存先ディレクトリ・ファイル名生成・パストラバーサル対策など FS 固有の関心をここに閉じ込める。
 */
@Injectable()
export class LocalImageStorage implements ImageStoragePort {
  constructor(private readonly config: ConfigService) {}

  async save(taskId: string, file: UploadedImage): Promise<string> {
    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) {
      throw new UnsupportedImageTypeError();
    }
    const dir = this.config.getOrThrow<string>('upload.dir');
    await mkdir(dir, { recursive: true });
    // サーバ生成名（taskId + uuid）＝クライアント由来の名前は使わない（パストラバーサル防止）
    const filename = `${taskId}-${randomUUID()}.${ext}`;
    await writeFile(join(dir, filename), file.buffer);
    return `/uploads/${filename}`;
  }

  async remove(publicPath: string | null): Promise<void> {
    if (!publicPath) return;
    const dir = this.config.getOrThrow<string>('upload.dir');
    try {
      // basename のみを使うため、保存ディレクトリ外への参照は起こり得ない
      await unlink(join(dir, basename(publicPath)));
    } catch {
      // 既に無い等は無視（掃除の失敗で本処理を巻き戻さない）
    }
  }
}

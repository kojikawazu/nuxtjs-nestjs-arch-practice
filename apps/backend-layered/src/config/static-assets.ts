import { mkdirSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * 添付画像を /uploads で静的配信する設定を適用する。
 * 保存先（upload.dir）は本番では docker volume をマウントしたパス、テストでは一時ディレクトリ。
 * main.ts と e2e のアプリ生成で共通利用し、配信元と保存先のズレを防ぐ。
 */
export function configureUploadStatic(app: NestExpressApplication, config: ConfigService): string {
  const dir = config.getOrThrow<string>('upload.dir');
  const rootPath = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
  mkdirSync(rootPath, { recursive: true });
  app.useStaticAssets(rootPath, { prefix: '/uploads' });
  return rootPath;
}

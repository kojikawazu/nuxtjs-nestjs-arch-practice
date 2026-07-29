import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllExceptionsFilter } from '../src/shared/presentation/filters/http-exception.filter';
import { configuration } from '../src/config/configuration';
import { configureUploadStatic } from '../src/config/static-assets';
import { AuthModule } from '../src/modules/auth/auth.module';
import { RefreshTokenOrmEntity } from '../src/modules/auth/infrastructure/refresh-token.orm-entity';
import { TaskOrmEntity } from '../src/modules/tasks/infrastructure/task.orm-entity';
import { TasksModule } from '../src/modules/tasks/tasks.module';
import { UserOrmEntity } from '../src/modules/users/infrastructure/user.orm-entity';
import { UsersModule } from '../src/modules/users/users.module';

/** e2e で生成した一時アップロード先（テスト側で後始末する）。 */
export let testUploadDir = '';

/**
 * e2e 用のアプリ生成。
 * 本番は MySQL だが、テストは外部依存なしで動くよう better-sqlite3 のインメモリ DB を使う。
 * 画像保存先も外部依存を避けるため OS の一時ディレクトリに隔離する。
 * （HTTP 境界・認可・バリデーション・エラーレスポンス・静的配信の検証が目的）
 */
export async function createTestApp(): Promise<INestApplication> {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.JWT_ACCESS_EXPIRES_IN = '900s';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  // 一時ディレクトリに画像を保存（外部依存なし）
  testUploadDir = mkdtempSync(join(tmpdir(), 'task-e2e-uploads-'));
  process.env.UPLOAD_DIR = testUploadDir;

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [configuration], ignoreEnvFile: true }),
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        dropSchema: true,
        synchronize: true,
        entities: [UserOrmEntity, RefreshTokenOrmEntity, TaskOrmEntity],
      }),
      UsersModule,
      AuthModule,
      TasksModule,
    ],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  // 添付画像の静的配信を本番と同じ経路（/uploads）で有効化する
  configureUploadStatic(app, app.get(ConfigService));
  await app.init();
  return app;
}

/** e2e 終了時に一時アップロードディレクトリを掃除する。 */
export function cleanupTestUploadDir(): void {
  if (testUploadDir) {
    rmSync(testUploadDir, { recursive: true, force: true });
    testUploadDir = '';
  }
}

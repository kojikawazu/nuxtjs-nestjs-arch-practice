import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { configuration } from '../src/config/configuration';
import { configureUploadStatic } from '../src/config/static-assets';
import { AuthModule } from '../src/modules/auth/auth.module';
import { RefreshTokenEntity } from '../src/modules/auth/entities/refresh-token.entity';
import { TaskEntity } from '../src/modules/tasks/infrastructure/task.entity';
import { TasksModule } from '../src/modules/tasks/tasks.module';
import { UserEntity } from '../src/modules/users/user.entity';
import { UsersModule } from '../src/modules/users/users.module';

/** e2e で生成した一時アップロード先（テスト側で後始末する）。 */
export let testUploadDir = '';

/**
 * e2e 用のアプリ生成。
 * DB は既定で外部依存なしの better-sqlite3 インメモリを使い、`E2E_DB_TYPE=mysql` 指定時のみ
 * 使い捨ての MySQL コンテナ（mysql-test の taskdb_e2e）に繋ぐ（本番忠実な E2E 用）。
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

  // 既定は外部依存なしの in-memory SQLite。E2E_DB_TYPE=mysql のときだけ使い捨て MySQL コンテナ（taskdb_e2e）に繋ぐ。
  const entities = [UserEntity, RefreshTokenEntity, TaskEntity];
  const dbOptions: TypeOrmModuleOptions =
    process.env.E2E_DB_TYPE === 'mysql'
      ? {
          type: 'mysql',
          host: process.env.E2E_DB_HOST ?? '127.0.0.1',
          port: Number(process.env.E2E_DB_PORT ?? 3307),
          username: process.env.E2E_DB_USERNAME ?? 'taskuser',
          password: process.env.E2E_DB_PASSWORD ?? 'taskpassword',
          database: process.env.E2E_DB_DATABASE ?? 'taskdb_e2e',
          dropSchema: true,
          synchronize: true,
          entities,
        }
      : {
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities,
        };

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [configuration], ignoreEnvFile: true }),
      TypeOrmModule.forRoot(dbOptions),
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

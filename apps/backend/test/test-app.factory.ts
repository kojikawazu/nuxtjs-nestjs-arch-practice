import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { configuration } from '../src/config/configuration';
import { AuthModule } from '../src/modules/auth/auth.module';
import { RefreshTokenEntity } from '../src/modules/auth/entities/refresh-token.entity';
import { TaskEntity } from '../src/modules/tasks/task.entity';
import { TasksModule } from '../src/modules/tasks/tasks.module';
import { UserEntity } from '../src/modules/users/user.entity';
import { UsersModule } from '../src/modules/users/users.module';

/**
 * e2e 用のアプリ生成。
 * 本番は MySQL だが、テストは外部依存なしで動くよう better-sqlite3 のインメモリ DB を使う。
 * （HTTP 境界・認可・バリデーション・エラーレスポンスの検証が目的）
 */
export async function createTestApp(): Promise<INestApplication> {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.JWT_ACCESS_EXPIRES_IN = '900s';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [configuration], ignoreEnvFile: true }),
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        dropSchema: true,
        synchronize: true,
        entities: [UserEntity, RefreshTokenEntity, TaskEntity],
      }),
      UsersModule,
      AuthModule,
      TasksModule,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

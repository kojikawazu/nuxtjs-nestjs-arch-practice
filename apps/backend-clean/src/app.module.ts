import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configuration } from './config/configuration';
import { UserOrmEntity } from './api/users/infrastructure/user.orm-entity';
import { RefreshTokenOrmEntity } from './api/auth/infrastructure/refresh-token.orm-entity';
import { TaskOrmEntity } from './api/tasks/infrastructure/task.orm-entity';
import { AuthModule } from './api/auth/auth.module';
import { TasksModule } from './api/tasks/tasks.module';
import { UsersModule } from './api/users/users.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['../../.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const entities = [UserOrmEntity, RefreshTokenOrmEntity, TaskOrmEntity];
        const synchronize = config.get<boolean>('db.synchronize') ?? false;
        // ローカル/E2E で Docker 不要に動かすための SQLite 切替
        if (config.getOrThrow<string>('db.type') === 'better-sqlite3') {
          return {
            type: 'better-sqlite3' as const,
            database: config.getOrThrow<string>('db.database'),
            entities,
            synchronize: true,
          };
        }
        return {
          type: 'mysql' as const,
          host: config.getOrThrow<string>('db.host'),
          port: config.getOrThrow<number>('db.port'),
          username: config.getOrThrow<string>('db.username'),
          password: config.getOrThrow<string>('db.password'),
          database: config.getOrThrow<string>('db.database'),
          entities,
          synchronize,
        };
      },
    }),
    UsersModule,
    AuthModule,
    TasksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

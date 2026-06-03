import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configuration } from './config/configuration';
import { UserEntity } from './modules/users/user.entity';
import { RefreshTokenEntity } from './modules/auth/entities/refresh-token.entity';
import { TaskEntity } from './modules/tasks/task.entity';
import { AuthModule } from './modules/auth/auth.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['../../.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.getOrThrow<string>('db.host'),
        port: config.getOrThrow<number>('db.port'),
        username: config.getOrThrow<string>('db.username'),
        password: config.getOrThrow<string>('db.password'),
        database: config.getOrThrow<string>('db.database'),
        entities: [UserEntity, RefreshTokenEntity, TaskEntity],
        synchronize: config.get<boolean>('db.synchronize') ?? false,
      }),
    }),
    UsersModule,
    AuthModule,
    TasksModule,
  ],
})
export class AppModule {}

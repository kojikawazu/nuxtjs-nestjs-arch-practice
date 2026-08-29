import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IMAGE_STORAGE } from './application/ports/image-storage.port';
import { TASK_QUERY } from './application/ports/task-query.port';
import { TASK_REPOSITORY } from './application/ports/task-repository.port';
import { GetTaskQueryService } from './application/query-services/get.query-service';
import { ListTasksQueryService } from './application/query-services/list.query-service';
import { CreateTaskUseCase } from './application/usecases/create.usecase';
import { DeleteTaskUseCase } from './application/usecases/delete.usecase';
import { RemoveTaskImageUseCase } from './application/usecases/remove-image.usecase';
import { SetTaskImageUseCase } from './application/usecases/set-image.usecase';
import { UpdateTaskUseCase } from './application/usecases/update.usecase';
import { CreateTaskValidator } from './application/validators/create.validator';
import { UpdateTaskValidator } from './application/validators/update.validator';
import { LocalImageStorage } from './infrastructure/services/local-image-storage';
import { TaskOrmEntity } from './infrastructure/entities/task.orm-entity';
import { TypeOrmTaskQuery } from './infrastructure/repositories/typeorm-task.query';
import { TypeOrmTaskRepository } from './infrastructure/repositories/typeorm-task.repository';
import { ImageFilePipe } from '../../shared/presentation/pipes/image-file.pipe';
import { TasksController } from './presentation/controllers/tasks.controller';

/**
 * tasks モジュールの DI 配線（クリーンアーキテクチャ）。
 *
 * presentation(Controller) → application(UseCase/QueryService/Validator) → Port(interface) という
 * 依存で、Port の実体（TypeORM / ローカルFS）は infrastructure 層が提供し、ここで束ねる。
 * application は Port にのみ依存し、TypeORM を知らない（依存性逆転）。
 * → レイヤード版（UseCase が `@InjectRepository` で TypeORM Repository を直接利用）との対比点。
 *
 * 読み取り（list/get）は CQRS の Query 側として TASK_QUERY（参照専用 Port）に分離し、
 * 書き込み（create/update/delete/image）の TASK_REPOSITORY と別経路にしている。
 * 業務ルール検証は validators に集約し、書き込みの UseCase が注入して呼ぶ（検証の実体を 1 か所に保つ）。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TaskOrmEntity]),
    // 画像の上限を Multer の受信段階へ渡す（設定 = 環境変数 MAX_UPLOAD_BYTES）。
    // ParseFilePipe 相当の検証だけだと、上限超過のファイルも一度メモリへ載ってから弾かれる。
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: { fileSize: config.getOrThrow<number>('upload.maxBytes') },
      }),
    }),
  ],
  controllers: [TasksController],
  providers: [
    // 読み取り（Query 側）
    ListTasksQueryService,
    GetTaskQueryService,
    // 書き込み（Command 側）
    CreateTaskUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
    SetTaskImageUseCase,
    RemoveTaskImageUseCase,
    // 添付画像の検証（設定から上限・許可 MIME を読む）
    ImageFilePipe,
    // 業務ルール検証（保存しない）
    CreateTaskValidator,
    UpdateTaskValidator,
    // Port ↔ 実装のバインド（依存性逆転の要）
    { provide: TASK_REPOSITORY, useClass: TypeOrmTaskRepository },
    { provide: TASK_QUERY, useClass: TypeOrmTaskQuery },
    { provide: IMAGE_STORAGE, useClass: LocalImageStorage },
  ],
})
export class TasksModule {}

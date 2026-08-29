import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TASK_QUERY } from './domain/repositories/task-query';
import { TASK_REPOSITORY } from './domain/repositories/task.repository';
import { IMAGE_STORAGE } from './domain/services/image-storage';
import { TaskAccessService } from './domain/services/task-access.service';
import { GetTaskQuery } from './application/queries/get.query';
import { ListTasksQuery } from './application/queries/list.query';
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
 * tasks モジュールの DI 配線（オニオンアーキテクチャ）。
 *
 * 依存は常に内向き: presentation → application(usecases/queries/validators) → domain(エンティティ/契約/ドメインサービス)。
 * 契約（TaskRepository / TaskQuery / ImageStorage）は **domain 中核**が所有し、実体は infrastructure が実装してここで束ねる。
 * ドメインサービス `TaskAccessService` も provider として登録する（usecases が再利用）。
 * → clean 版（契約を application/ports に置く）との配置上の対比点。
 *
 * 読み取り（list/get）は CQRS の Query 側として TASK_QUERY（参照専用の domain 契約）に分離し、
 * 書き込み（create/update/delete/image）の TASK_REPOSITORY と別経路にしている。
 * 業務ルール検証は validators に集約し、書き込みの UseCase が注入して呼ぶ（検証の実体を 1 か所に保つ）。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TaskOrmEntity]),
    // 画像の上限を Multer の受信段階へ渡す（設定 = 環境変数 MAX_UPLOAD_BYTES）。
    // Pipe の検証だけだと、上限超過のファイルも一度メモリへ載ってから弾かれる。
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: { fileSize: config.getOrThrow<number>('upload.maxBytes') },
      }),
    }),
  ],
  controllers: [TasksController],
  providers: [
    // ドメインサービス
    TaskAccessService,
    // 読み取り（Query 側）
    ListTasksQuery,
    GetTaskQuery,
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
    // 契約（domain）↔ 実装（infrastructure）のバインド
    { provide: TASK_REPOSITORY, useClass: TypeOrmTaskRepository },
    { provide: TASK_QUERY, useClass: TypeOrmTaskQuery },
    { provide: IMAGE_STORAGE, useClass: LocalImageStorage },
  ],
})
export class TasksModule {}

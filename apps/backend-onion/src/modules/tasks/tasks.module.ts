import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TASK_QUERY } from './domain/repositories/task-query';
import { TASK_REPOSITORY } from './domain/repositories/task.repository';
import { IMAGE_STORAGE } from './domain/services/image-storage';
import { TaskAccessService } from './domain/services/task-access.service';
import { GetTaskQuery } from './application/queries/get-task.query';
import { ListTasksQuery } from './application/queries/list-tasks.query';
import { CreateTaskUseCase } from './application/usecases/create-task.usecase';
import { DeleteTaskUseCase } from './application/usecases/delete-task.usecase';
import { RemoveTaskImageUseCase } from './application/usecases/remove-task-image.usecase';
import { SetTaskImageUseCase } from './application/usecases/set-task-image.usecase';
import { UpdateTaskUseCase } from './application/usecases/update-task.usecase';
import { ValidateCreateTaskUseCase } from './application/usecases/validate-create-task.usecase';
import { ValidateUpdateTaskUseCase } from './application/usecases/validate-update-task.usecase';
import { LocalImageStorage } from './infrastructure/services/local-image-storage';
import { TaskOrmEntity } from './infrastructure/entities/task.orm-entity';
import { TypeOrmTaskQuery } from './infrastructure/repositories/typeorm-task.query';
import { TypeOrmTaskRepository } from './infrastructure/repositories/typeorm-task.repository';
import { TasksController } from './presentation/controllers/tasks.controller';

/**
 * tasks モジュールの DI 配線（オニオンアーキテクチャ）。
 *
 * 依存は常に内向き: presentation → application(usecases/queries) → domain(エンティティ/契約/ドメインサービス)。
 * 契約（TaskRepository / TaskQuery / ImageStorage）は **domain 中核**が所有し、実体は infrastructure が実装してここで束ねる。
 * ドメインサービス `TaskAccessService` も provider として登録する（usecases が再利用）。
 * → clean 版（契約を application/ports に置く）との配置上の対比点。
 *
 * 読み取り（list/get）は CQRS の Query 側として TASK_QUERY（参照専用の domain 契約）に分離し、
 * 書き込み（create/update/delete/image/validate）の TASK_REPOSITORY と別経路にしている。
 */
@Module({
  imports: [TypeOrmModule.forFeature([TaskOrmEntity])],
  controllers: [TasksController],
  providers: [
    // ドメインサービス
    TaskAccessService,
    // 読み取り（Query 側）
    ListTasksQuery,
    GetTaskQuery,
    // アプリケーションサービス（ユースケース・書き込み）
    CreateTaskUseCase,
    ValidateCreateTaskUseCase,
    UpdateTaskUseCase,
    ValidateUpdateTaskUseCase,
    DeleteTaskUseCase,
    SetTaskImageUseCase,
    RemoveTaskImageUseCase,
    // 契約（domain）↔ 実装（infrastructure）のバインド
    { provide: TASK_REPOSITORY, useClass: TypeOrmTaskRepository },
    { provide: TASK_QUERY, useClass: TypeOrmTaskQuery },
    { provide: IMAGE_STORAGE, useClass: LocalImageStorage },
  ],
})
export class TasksModule {}

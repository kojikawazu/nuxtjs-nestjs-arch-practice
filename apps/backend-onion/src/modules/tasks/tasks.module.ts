import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TASK_REPOSITORY } from './domain/repositories/task.repository';
import { IMAGE_STORAGE } from './domain/services/image-storage';
import { TaskAccessService } from './domain/services/task-access.service';
import { CreateTaskUseCase } from './application/usecases/create-task.usecase';
import { DeleteTaskUseCase } from './application/usecases/delete-task.usecase';
import { GetTaskUseCase } from './application/usecases/get-task.usecase';
import { ListTasksUseCase } from './application/usecases/list-tasks.usecase';
import { RemoveTaskImageUseCase } from './application/usecases/remove-task-image.usecase';
import { SetTaskImageUseCase } from './application/usecases/set-task-image.usecase';
import { UpdateTaskUseCase } from './application/usecases/update-task.usecase';
import { ValidateCreateTaskUseCase } from './application/usecases/validate-create-task.usecase';
import { ValidateUpdateTaskUseCase } from './application/usecases/validate-update-task.usecase';
import { LocalImageStorage } from './infrastructure/local-image-storage';
import { TaskOrmEntity } from './infrastructure/task.orm-entity';
import { TypeOrmTaskRepository } from './infrastructure/typeorm-task.repository';
import { TasksController } from './presentation/tasks.controller';

/**
 * tasks モジュールの DI 配線（オニオンアーキテクチャ）。
 *
 * 依存は常に内向き: presentation → application(usecases) → domain(エンティティ/契約/ドメインサービス)。
 * 契約（TaskRepository / ImageStorage）は **domain 中核**が所有し、実体は infrastructure が実装してここで束ねる。
 * ドメインサービス `TaskAccessService` も provider として登録する（usecases が再利用）。
 * → clean 版（契約を application/ports に置く）との配置上の対比点。
 */
@Module({
  imports: [TypeOrmModule.forFeature([TaskOrmEntity])],
  controllers: [TasksController],
  providers: [
    // ドメインサービス
    TaskAccessService,
    // アプリケーションサービス（ユースケース）
    ListTasksUseCase,
    CreateTaskUseCase,
    ValidateCreateTaskUseCase,
    GetTaskUseCase,
    UpdateTaskUseCase,
    ValidateUpdateTaskUseCase,
    DeleteTaskUseCase,
    SetTaskImageUseCase,
    RemoveTaskImageUseCase,
    // 契約（domain）↔ 実装（infrastructure）のバインド
    { provide: TASK_REPOSITORY, useClass: TypeOrmTaskRepository },
    { provide: IMAGE_STORAGE, useClass: LocalImageStorage },
  ],
})
export class TasksModule {}

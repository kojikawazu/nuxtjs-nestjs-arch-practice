import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IMAGE_STORAGE } from './application/ports/image-storage.port';
import { TASK_QUERY } from './application/ports/task-query.port';
import { TASK_REPOSITORY } from './application/ports/task-repository.port';
import { GetTaskQuery } from './application/queries/get-task.query';
import { ListTasksQuery } from './application/queries/list-tasks.query';
import { CreateTaskUseCase } from './application/usecases/create-task.usecase';
import { DeleteTaskUseCase } from './application/usecases/delete-task.usecase';
import { RemoveTaskImageUseCase } from './application/usecases/remove-task-image.usecase';
import { SetTaskImageUseCase } from './application/usecases/set-task-image.usecase';
import { UpdateTaskUseCase } from './application/usecases/update-task.usecase';
import { ValidateCreateTaskUseCase } from './application/usecases/validate-create-task.usecase';
import { ValidateUpdateTaskUseCase } from './application/usecases/validate-update-task.usecase';
import { LocalImageStorage } from './infrastructure/local-image-storage';
import { TaskOrmEntity } from './infrastructure/task.orm-entity';
import { TypeOrmTaskQuery } from './infrastructure/typeorm-task.query';
import { TypeOrmTaskRepository } from './infrastructure/typeorm-task.repository';
import { TasksController } from './presentation/tasks.controller';

/**
 * tasks モジュールの DI 配線（クリーンアーキテクチャ）。
 *
 * presentation(Controller) → application(UseCase/Query) → Port(interface) という依存で、
 * Port の実体（TypeORM / ローカルFS）は infrastructure 層が提供し、ここで束ねる。
 * UseCase/Query は Port にのみ依存し、TypeORM を知らない（依存性逆転）。
 * → レイヤード版（UseCase が `@InjectRepository` で TypeORM Repository を直接利用）との対比点。
 *
 * 読み取り（list/get）は CQRS の Query 側として TASK_QUERY（参照専用 Port）に分離し、
 * 書き込み（create/update/delete/image/validate）の TASK_REPOSITORY と別経路にしている。
 */
@Module({
  imports: [TypeOrmModule.forFeature([TaskOrmEntity])],
  controllers: [TasksController],
  providers: [
    // 読み取り（Query 側）
    ListTasksQuery,
    GetTaskQuery,
    // 書き込み（Command 側）
    CreateTaskUseCase,
    ValidateCreateTaskUseCase,
    UpdateTaskUseCase,
    ValidateUpdateTaskUseCase,
    DeleteTaskUseCase,
    SetTaskImageUseCase,
    RemoveTaskImageUseCase,
    // Port ↔ 実装のバインド（依存性逆転の要）
    { provide: TASK_REPOSITORY, useClass: TypeOrmTaskRepository },
    { provide: TASK_QUERY, useClass: TypeOrmTaskQuery },
    { provide: IMAGE_STORAGE, useClass: LocalImageStorage },
  ],
})
export class TasksModule {}

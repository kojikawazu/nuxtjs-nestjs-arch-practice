import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IMAGE_STORAGE } from './application/ports/image-storage.port';
import { TASK_REPOSITORY } from './application/ports/task-repository.port';
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
 * tasks モジュールの DI 配線（クリーンアーキテクチャ）。
 *
 * presentation(Controller) → application(UseCase) → Port(interface) という依存で、
 * Port の実体（TypeORM / ローカルFS）は infrastructure 層が提供し、ここで束ねる。
 * UseCase は Port にのみ依存し、TypeORM を知らない（依存性逆転）。
 * → レイヤード版（UseCase が `@InjectRepository` で TypeORM Repository を直接利用）との対比点。
 */
@Module({
  imports: [TypeOrmModule.forFeature([TaskOrmEntity])],
  controllers: [TasksController],
  providers: [
    ListTasksUseCase,
    CreateTaskUseCase,
    ValidateCreateTaskUseCase,
    GetTaskUseCase,
    UpdateTaskUseCase,
    ValidateUpdateTaskUseCase,
    DeleteTaskUseCase,
    SetTaskImageUseCase,
    RemoveTaskImageUseCase,
    // Port ↔ 実装のバインド（依存性逆転の要）
    { provide: TASK_REPOSITORY, useClass: TypeOrmTaskRepository },
    { provide: IMAGE_STORAGE, useClass: LocalImageStorage },
  ],
})
export class TasksModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateTaskUseCase } from './application/usecases/create-task.usecase';
import { DeleteTaskUseCase } from './application/usecases/delete-task.usecase';
import { GetTaskUseCase } from './application/usecases/get-task.usecase';
import { ListTasksUseCase } from './application/usecases/list-tasks.usecase';
import { RemoveTaskImageUseCase } from './application/usecases/remove-task-image.usecase';
import { SetTaskImageUseCase } from './application/usecases/set-task-image.usecase';
import { UpdateTaskUseCase } from './application/usecases/update-task.usecase';
import { ValidateCreateTaskUseCase } from './application/usecases/validate-create-task.usecase';
import { ValidateUpdateTaskUseCase } from './application/usecases/validate-update-task.usecase';
import { IMAGE_STORAGE } from './application/ports/image-storage.port';
import { TASK_REPOSITORY } from './application/ports/task-repository.port';
import { TaskEntity } from './infrastructure/entities/task.entity';
import { TypeormTaskRepository } from './infrastructure/repositories/typeorm-task.repository';
import { LocalImageStorage } from './infrastructure/storage/local-image-storage';
import { TasksController } from './presentation/tasks.controller';

/**
 * tasks モジュールの DI 配線（クリーンアーキテクチャ / Onion）。
 *
 * UseCase（application）はポート（TASK_REPOSITORY / IMAGE_STORAGE）に依存し、
 * その実体（infrastructure の TypeORM 実装・ローカル FS 実装）をここで束ねる（依存性逆転）。
 */
@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity])],
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
    { provide: TASK_REPOSITORY, useClass: TypeormTaskRepository },
    { provide: IMAGE_STORAGE, useClass: LocalImageStorage },
  ],
})
export class TasksModule {}

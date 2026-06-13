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
import { TaskEntity } from './infrastructure/task.entity';
import { TasksController } from './presentation/tasks.controller';

/**
 * tasks モジュールの DI 配線（レイヤード + UseCase）。
 *
 * presentation(Controller) → application(UseCase) → infrastructure(TypeORM Repository) の素直な
 * 依存。UseCase は `@InjectRepository` で Repository を直接利用する（ポートによる逆転はしない）。
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
  ],
})
export class TasksModule {}

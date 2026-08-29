import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateTaskUseCase } from './application/usecases/create.usecase';
import { DeleteTaskUseCase } from './application/usecases/delete.usecase';
import { GetTaskUseCase } from './application/usecases/get.usecase';
import { ListTasksUseCase } from './application/usecases/list.usecase';
import { RemoveTaskImageUseCase } from './application/usecases/remove-image.usecase';
import { SetTaskImageUseCase } from './application/usecases/set-image.usecase';
import { UpdateTaskUseCase } from './application/usecases/update.usecase';
import { ValidateCreateTaskUseCase } from './application/usecases/validate-create.usecase';
import { ValidateUpdateTaskUseCase } from './application/usecases/validate-update.usecase';
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

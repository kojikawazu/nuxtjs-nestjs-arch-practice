import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IMAGE_STORAGE } from './application/ports/image-storage.port';
import { TASK_QUERY } from './application/ports/task-query.port';
import { TASK_REPOSITORY } from './application/ports/task-repository.port';
import { GetTaskQueryService } from './application/query-services/get-task.query-service';
import { ListTasksQueryService } from './application/query-services/list-tasks.query-service';
import { CreateTaskUseCase } from './application/usecases/create-task.usecase';
import { DeleteTaskUseCase } from './application/usecases/delete-task.usecase';
import { RemoveTaskImageUseCase } from './application/usecases/remove-task-image.usecase';
import { SetTaskImageUseCase } from './application/usecases/set-task-image.usecase';
import { UpdateTaskUseCase } from './application/usecases/update-task.usecase';
import { CreateTaskValidator } from './application/validators/create-task.validator';
import { UpdateTaskValidator } from './application/validators/update-task.validator';
import { LocalImageStorage } from './infrastructure/services/local-image-storage';
import { TaskOrmEntity } from './infrastructure/entities/task.orm-entity';
import { TypeOrmTaskQuery } from './infrastructure/repositories/typeorm-task.query';
import { TypeOrmTaskRepository } from './infrastructure/repositories/typeorm-task.repository';
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
 * 検証のみ（DryRun）は validators が担い、UseCase（保存）とは別 provider にしている。
 */
@Module({
  imports: [TypeOrmModule.forFeature([TaskOrmEntity])],
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
    // 検証のみ（DryRun）
    CreateTaskValidator,
    UpdateTaskValidator,
    // Port ↔ 実装のバインド（依存性逆転の要）
    { provide: TASK_REPOSITORY, useClass: TypeOrmTaskRepository },
    { provide: TASK_QUERY, useClass: TypeOrmTaskQuery },
    { provide: IMAGE_STORAGE, useClass: LocalImageStorage },
  ],
})
export class TasksModule {}

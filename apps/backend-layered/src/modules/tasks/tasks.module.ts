import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateTaskUseCase } from './application/usecases/create.usecase';
import { DeleteTaskUseCase } from './application/usecases/delete.usecase';
import { GetTaskUseCase } from './application/usecases/get.usecase';
import { ListTasksUseCase } from './application/usecases/list.usecase';
import { RemoveTaskImageUseCase } from './application/usecases/remove-image.usecase';
import { SetTaskImageUseCase } from './application/usecases/set-image.usecase';
import { UpdateTaskUseCase } from './application/usecases/update.usecase';
import { TaskEntity } from './infrastructure/task.entity';
import { ImageFilePipe } from '../../common/pipes/image-file.pipe';
import { TasksController } from './presentation/tasks.controller';

/**
 * tasks モジュールの DI 配線（レイヤード + UseCase）。
 *
 * presentation(Controller) → application(UseCase) → infrastructure(TypeORM Repository) の素直な
 * 依存。UseCase は `@InjectRepository` で Repository を直接利用する（ポートによる逆転はしない）。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TaskEntity]),
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
    // 添付画像の検証（設定から上限・許可 MIME を読む）
    ImageFilePipe,
    ListTasksUseCase,
    CreateTaskUseCase,
    GetTaskUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
    SetTaskImageUseCase,
    RemoveTaskImageUseCase,
  ],
})
export class TasksModule {}

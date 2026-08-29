import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Task, TaskCreate, TaskUpdate } from '@app/api-client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ImageFilePipe } from '../../../common/pipes/image-file.pipe';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateTaskUseCase } from '../application/usecases/create.usecase';
import { DeleteTaskUseCase } from '../application/usecases/delete.usecase';
import { GetTaskUseCase } from '../application/usecases/get.usecase';
import { ListTasksUseCase } from '../application/usecases/list.usecase';
import { RemoveTaskImageUseCase } from '../application/usecases/remove-image.usecase';
import { SetTaskImageUseCase } from '../application/usecases/set-image.usecase';
import { UpdateTaskUseCase } from '../application/usecases/update.usecase';
import { createTaskSchema } from './dto/create.dto';
import { updateTaskSchema } from './dto/update.dto';

/**
 * タスクの HTTP 入口（presentation 層）。
 * 認証・入力検証（DTO/Pipe）に専念し、処理は各 UseCase（application 層）へ委譲する。
 */
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly listTasks: ListTasksUseCase,
    private readonly createTask: CreateTaskUseCase,
    private readonly getTask: GetTaskUseCase,
    private readonly updateTask: UpdateTaskUseCase,
    private readonly deleteTask: DeleteTaskUseCase,
    private readonly setTaskImage: SetTaskImageUseCase,
    private readonly removeTaskImage: RemoveTaskImageUseCase,
  ) {}

  /**
   * タスクの取得(複数)
   * 実API: GET /tasks
   * 処理の実体: ListTasksUseCase.execute（application/usecases/list.usecase.ts）
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元した認証ユーザー）
   * @returns Promise<Task[]>（Task の源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<Task[]> {
    return this.listTasks.execute(user.userId);
  }

  /**
   * タスクの作成
   * 実API: POST /tasks（成功時 201 Created）
   * 処理の実体: CreateTaskUseCase.execute（application/usecases/create.usecase.ts）
   *   ※ dto は ZodValidationPipe(createTaskSchema) で検証済み（未知キーは .strict で 422）
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @param dto - TaskCreate（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<Task>（Task の源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createTaskSchema)) dto: TaskCreate,
  ): Promise<Task> {
    return this.createTask.execute(user.userId, dto);
  }

  /**
   * タスクの取得(単一)
   * 実API: GET /tasks/{id}
   * 処理の実体: GetTaskUseCase.execute（application/usecases/get.usecase.ts）
   *   ※ 不存在=404 / 非所有=403 を区別
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @param id - string（対象タスクの ID・パスパラメータ）
   * @returns Promise<Task>（Task の源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<Task> {
    return this.getTask.execute(user.userId, id);
  }

  /**
   * タスクの更新（指定フィールドのみ）
   * 実API: PATCH /tasks/{id}
   * 処理の実体: UpdateTaskUseCase.execute（application/usecases/update.usecase.ts）
   *   ※ dto は ZodValidationPipe(updateTaskSchema) で検証済み
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @param id - string（対象タスクの ID・パスパラメータ）
   * @param dto - TaskUpdate（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<Task>（Task の源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) dto: TaskUpdate,
  ): Promise<Task> {
    return this.updateTask.execute(user.userId, id, dto);
  }

  /**
   * タスクの削除
   * 実API: DELETE /tasks/{id}（成功時 204 No Content）
   * 処理の実体: DeleteTaskUseCase.execute（application/usecases/delete.usecase.ts）
   *   ※ 不存在=404 / 非所有=403 を区別
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @param id - string（対象タスクの ID・パスパラメータ）
   * @returns Promise<void>（本文なし・204）
   */
  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.deleteTask.execute(user.userId, id);
  }

  /**
   * 画像添付（1枚・multipart/form-data, フィールド名 `file`）
   * 実API: POST /tasks/{id}/image
   * 処理の実体: SetTaskImageUseCase.execute（application/usecases/set-image.usecase.ts）
   *   ※ サイズ上限は Multer が受信段階で弾く（超過は 413）。MIME・欠落は ImageFilePipe が 422
   *     （errors.field は file）。上限・許可 MIME は設定（MAX_UPLOAD_BYTES）由来
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @param id - string（対象タスクの ID・パスパラメータ）
   * @param file - Express.Multer.File（multipart の file フィールド）
   * @returns Promise<Task>（imageUrl 入り。Task の源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    // 上限・許可 MIME は設定（MAX_UPLOAD_BYTES）から読むため、DI 可能な Pipe クラスで検証する
    @UploadedFile(ImageFilePipe)
    file: Express.Multer.File,
  ): Promise<Task> {
    return this.setTaskImage.execute(user.userId, id, file);
  }

  /**
   * 添付画像の削除
   * 実API: DELETE /tasks/{id}/image
   * 処理の実体: RemoveTaskImageUseCase.execute（application/usecases/remove-image.usecase.ts）
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @param id - string（対象タスクの ID・パスパラメータ）
   * @returns Promise<Task>（imageUrl の消えた Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Delete(':id/image')
  removeImage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<Task> {
    return this.removeTaskImage.execute(user.userId, id);
  }
}

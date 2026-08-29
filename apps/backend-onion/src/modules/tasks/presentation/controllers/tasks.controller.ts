import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UnprocessableEntityException,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Task, TaskCreate, TaskUpdate } from '@app/api-client';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../../shared/presentation/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../../auth/auth.types';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { toCreateTaskInput } from '../../application/inputs/create.input';
import { toUpdateTaskInput } from '../../application/inputs/update.input';
import { GetTaskQuery } from '../../application/queries/get.query';
import { ListTasksQuery } from '../../application/queries/list.query';
import { CreateTaskUseCase } from '../../application/usecases/create.usecase';
import { DeleteTaskUseCase } from '../../application/usecases/delete.usecase';
import { RemoveTaskImageUseCase } from '../../application/usecases/remove-image.usecase';
import { SetTaskImageUseCase } from '../../application/usecases/set-image.usecase';
import { UpdateTaskUseCase } from '../../application/usecases/update.usecase';
import { createTaskSchema } from '../dto/create.dto';
import { updateTaskSchema } from '../dto/update.dto';

/**
 * タスクの HTTP 入口（presentation 層）。
 * 認証・入力検証（DTO/Pipe）に専念し、処理は各 UseCase（書き込み）/ Query（読み取り）へ委譲する。
 */
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly listTasks: ListTasksQuery,
    private readonly createTask: CreateTaskUseCase,
    private readonly getTask: GetTaskQuery,
    private readonly updateTask: UpdateTaskUseCase,
    private readonly deleteTask: DeleteTaskUseCase,
    private readonly setTaskImage: SetTaskImageUseCase,
    private readonly removeTaskImage: RemoveTaskImageUseCase,
  ) {}

  /**
   * タスクの取得(複数)
   * 実API: GET /tasks
   * 処理の実体: ListTasksQuery.execute（application/queries/list.query.ts）
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
   *   ※ body は ZodValidationPipe(createTaskSchema) で検証後（未知キーは .strict で 422）、
   *     toCreateTaskInput で application の Input に変換する
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @param body - TaskCreate（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<Task>（Task の源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createTaskSchema)) body: TaskCreate,
  ): Promise<Task> {
    return this.createTask.execute(toCreateTaskInput(user.userId, body));
  }

  /**
   * タスクの取得(単一)
   * 実API: GET /tasks/{id}
   * 処理の実体: GetTaskQuery.execute（application/queries/get.query.ts）
   *   ※ 不存在=404 / 非所有=403 を区別（owner 判定は Query 側で実施）
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
   *   ※ body は ZodValidationPipe(updateTaskSchema) で検証後、toUpdateTaskInput で Input に変換する
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @param id - string（対象タスクの ID・パスパラメータ）
   * @param body - TaskUpdate（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<Task>（Task の源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) body: TaskUpdate,
  ): Promise<Task> {
    return this.updateTask.execute(toUpdateTaskInput(user.userId, id, body));
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
   *   ※ MIME（png/jpeg/webp）とサイズ（≤2MB）を ParseFilePipe で検証し、違反は 422（errors.field は file）
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @param id - string（対象タスクの ID・パスパラメータ）
   * @param file - Express.Multer.File（multipart の file フィールド。ImageFile に詰め替えて委譲）
   * @returns Promise<Task>（imageUrl 入り。Task の源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        // 申告 MIME で判定する（マジックナンバー検査は無効化）。拡張子の確定は UseCase 側でも担保。
        .addFileTypeValidator({
          fileType: /^image\/(png|jpe?g|webp)$/,
          skipMagicNumbersValidation: true,
        })
        .addMaxSizeValidator({ maxSize: 2 * 1024 * 1024 })
        .build({
          fileIsRequired: true,
          // 画像も JSON ボディと同じ「検証失敗 = 422 + フィールド別の理由」に揃える。
          // field は multipart のフィールド名（file）＝契約上の入力名。
          exceptionFactory: (message: string) =>
            new UnprocessableEntityException({
              message,
              errors: [{ field: 'file', messages: [message] }],
            }),
        }),
    )
    file: Express.Multer.File,
  ): Promise<Task> {
    // Express の file から application 層の ImageFile（mimetype/buffer のみ）へ詰め替える
    return this.setTaskImage.execute(user.userId, id, {
      mimetype: file.mimetype,
      buffer: file.buffer,
    });
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

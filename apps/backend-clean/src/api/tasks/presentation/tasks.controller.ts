import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { DryRunResult, Task, TaskCreate, TaskUpdate } from '@app/api-client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { toCreateTaskInput } from '../application/inputs/create-task.input';
import { toUpdateTaskInput } from '../application/inputs/update-task.input';
import { GetTaskQueryService } from '../application/query-services/get-task.query-service';
import { ListTasksQueryService } from '../application/query-services/list-tasks.query-service';
import { CreateTaskUseCase } from '../application/usecases/create-task.usecase';
import { DeleteTaskUseCase } from '../application/usecases/delete-task.usecase';
import { RemoveTaskImageUseCase } from '../application/usecases/remove-task-image.usecase';
import { SetTaskImageUseCase } from '../application/usecases/set-task-image.usecase';
import { UpdateTaskUseCase } from '../application/usecases/update-task.usecase';
import { CreateTaskValidator } from '../application/validators/create-task.validator';
import { UpdateTaskValidator } from '../application/validators/update-task.validator';
import { createTaskSchema } from './dto/create-task.dto';
import { updateTaskSchema } from './dto/update-task.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * タスクの HTTP 入口（presentation 層）。
 * 認証・入力検証（DTO/Pipe）に専念し、DTO → application の Input に詰め替えてから
 * 各 UseCase（書き込み）/ QueryService（読み取り）/ Validator（DryRun）へ委譲する。
 * application 側は presentation の DTO を知らない（依存は常に内向き）。
 */
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly listTasks: ListTasksQueryService,
    private readonly createTask: CreateTaskUseCase,
    private readonly validateCreateTask: CreateTaskValidator,
    private readonly getTask: GetTaskQueryService,
    private readonly updateTask: UpdateTaskUseCase,
    private readonly validateUpdateTask: UpdateTaskValidator,
    private readonly deleteTask: DeleteTaskUseCase,
    private readonly setTaskImage: SetTaskImageUseCase,
    private readonly removeTaskImage: RemoveTaskImageUseCase,
  ) {}

  /**
   * タスクの取得(複数)
   * 実API: GET /tasks
   * 処理の実体: ListTasksQueryService.execute（application/query-services/list-tasks.query-service.ts）
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
   * 処理の実体: CreateTaskUseCase.execute（application/usecases/create-task.usecase.ts）
   *   ※ body は ZodValidationPipe(createTaskSchema) で検証後、toCreateTaskInput で application の Input に変換
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
   * タスク作成の事前検証（DryRun・DB に保存しない）
   * 実API: POST /tasks/validate（成功時 200 OK）
   * 処理の実体: CreateTaskValidator.execute（application/validators/create-task.validator.ts）
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @param body - TaskCreate（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<DryRunResult>（{ valid: true }。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post('validate')
  @HttpCode(200)
  async createValidate(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createTaskSchema)) body: TaskCreate,
  ): Promise<DryRunResult> {
    this.validateCreateTask.execute(toCreateTaskInput(user.userId, body));
    return { valid: true };
  }

  /**
   * タスクの取得(単一)
   * 実API: GET /tasks/{id}
   * 処理の実体: GetTaskQueryService.execute（application/query-services/get-task.query-service.ts）
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
   * 処理の実体: UpdateTaskUseCase.execute（application/usecases/update-task.usecase.ts）
   *   ※ body は ZodValidationPipe(updateTaskSchema) で検証後、toUpdateTaskInput で Input に変換
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
   * タスク更新の事前検証（DryRun・DB に保存しない）
   * 実API: POST /tasks/{id}/validate（成功時 200 OK）
   * 処理の実体: UpdateTaskValidator.execute（application/validators/update-task.validator.ts）
   *   ※ マージ後の値で開始 ≤ 終了などを検証。不存在=404 / 非所有=403 も区別
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @param id - string（対象タスクの ID・パスパラメータ）
   * @param body - TaskUpdate（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<DryRunResult>（{ valid: true }。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post(':id/validate')
  @HttpCode(200)
  async updateValidate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) body: TaskUpdate,
  ): Promise<DryRunResult> {
    await this.validateUpdateTask.execute(toUpdateTaskInput(user.userId, id, body));
    return { valid: true };
  }

  /**
   * タスクの削除
   * 実API: DELETE /tasks/{id}（成功時 204 No Content）
   * 処理の実体: DeleteTaskUseCase.execute（application/usecases/delete-task.usecase.ts）
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
   * 処理の実体: SetTaskImageUseCase.execute（application/usecases/set-task-image.usecase.ts）
   *   ※ MIME（png/jpeg/webp）とサイズ（≤2MB）を ParseFilePipe で検証し、違反は 400
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
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST, fileIsRequired: true }),
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
   * 処理の実体: RemoveTaskImageUseCase.execute（application/usecases/remove-task-image.usecase.ts）
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @param id - string（対象タスクの ID・パスパラメータ）
   * @returns Promise<Task>（imageUrl の消えた Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Delete(':id/image')
  removeImage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<Task> {
    return this.removeTaskImage.execute(user.userId, id);
  }
}

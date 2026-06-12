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
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { DryRunResult, Task as ContractTask } from '@app/api-client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateTaskUseCase } from '../application/usecases/create-task.usecase';
import { DeleteTaskUseCase } from '../application/usecases/delete-task.usecase';
import { GetTaskUseCase } from '../application/usecases/get-task.usecase';
import { ListTasksUseCase } from '../application/usecases/list-tasks.usecase';
import { RemoveTaskImageUseCase } from '../application/usecases/remove-task-image.usecase';
import { SetTaskImageUseCase } from '../application/usecases/set-task-image.usecase';
import { UpdateTaskUseCase } from '../application/usecases/update-task.usecase';
import { ValidateCreateTaskUseCase } from '../application/usecases/validate-create-task.usecase';
import { ValidateUpdateTaskUseCase } from '../application/usecases/validate-update-task.usecase';
import { DomainExceptionFilter } from './domain-exception.filter';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskRequestMapper } from './task-request.mapper';
import { toContractTask } from './task-response.mapper';

/**
 * タスクの HTTP 入口（presentation 層）。
 * 認証・入力検証（DTO/Pipe）・DTO⇄ドメイン変換・ドメインエラーの HTTP 化に専念し、
 * 業務処理は各 UseCase に委譲する。
 */
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@UseFilters(DomainExceptionFilter)
export class TasksController {
  constructor(
    private readonly listTasks: ListTasksUseCase,
    private readonly createTask: CreateTaskUseCase,
    private readonly validateCreateTask: ValidateCreateTaskUseCase,
    private readonly getTask: GetTaskUseCase,
    private readonly updateTask: UpdateTaskUseCase,
    private readonly validateUpdateTask: ValidateUpdateTaskUseCase,
    private readonly deleteTask: DeleteTaskUseCase,
    private readonly setTaskImage: SetTaskImageUseCase,
    private readonly removeTaskImage: RemoveTaskImageUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<ContractTask[]> {
    const tasks = await this.listTasks.execute(user.userId);
    return tasks.map(toContractTask);
  }

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ): Promise<ContractTask> {
    const task = await this.createTask.execute(TaskRequestMapper.toNewTaskInput(user.userId, dto));
    return toContractTask(task);
  }

  @Post('validate')
  @HttpCode(200)
  async createValidate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ): Promise<DryRunResult> {
    this.validateCreateTask.execute(TaskRequestMapper.toNewTaskInput(user.userId, dto));
    return { valid: true };
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ContractTask> {
    const task = await this.getTask.execute(user.userId, id);
    return toContractTask(task);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<ContractTask> {
    const task = await this.updateTask.execute(
      user.userId,
      id,
      TaskRequestMapper.toTaskUpdateInput(dto),
    );
    return toContractTask(task);
  }

  @Post(':id/validate')
  @HttpCode(200)
  async updateValidate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<DryRunResult> {
    await this.validateUpdateTask.execute(
      user.userId,
      id,
      TaskRequestMapper.toTaskUpdateInput(dto),
    );
    return { valid: true };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.deleteTask.execute(user.userId, id);
  }

  /**
   * 画像添付（multipart/form-data, フィールド名 `file`）。
   * MIME（png/jpeg/webp）とサイズ（≤2MB）を ParseFilePipe で検証し、違反は 400。
   */
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        // 申告 MIME で判定する（マジックナンバー検査は無効化）。拡張子の確定は Storage 側でも担保。
        .addFileTypeValidator({
          fileType: /^image\/(png|jpe?g|webp)$/,
          skipMagicNumbersValidation: true,
        })
        .addMaxSizeValidator({ maxSize: 2 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST, fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ): Promise<ContractTask> {
    const task = await this.setTaskImage.execute(user.userId, id, file);
    return toContractTask(task);
  }

  /** 添付画像の削除（更新後の Task を返す）。 */
  @Delete(':id/image')
  async removeImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ContractTask> {
    const task = await this.removeTaskImage.execute(user.userId, id);
    return toContractTask(task);
  }
}

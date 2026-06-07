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
import type { DryRunResult, Task } from '@app/api-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<Task[]> {
    return this.tasks.list(user.userId);
  }

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaskDto): Promise<Task> {
    return this.tasks.create(user.userId, dto);
  }

  @Post('validate')
  @HttpCode(200)
  async createValidate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ): Promise<DryRunResult> {
    await this.tasks.validateCreate(user.userId, dto);
    return { valid: true };
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<Task> {
    return this.tasks.getById(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<Task> {
    return this.tasks.update(user.userId, id, dto);
  }

  @Post(':id/validate')
  @HttpCode(200)
  async updateValidate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<DryRunResult> {
    await this.tasks.validateUpdate(user.userId, id, dto);
    return { valid: true };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.tasks.remove(user.userId, id);
  }

  /**
   * 画像添付（multipart/form-data, フィールド名 `file`）。
   * MIME（png/jpeg/webp）とサイズ（≤2MB）を ParseFilePipe で検証し、違反は 400。
   */
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        // 申告 MIME で判定する（マジックナンバー検査は無効化）。拡張子の確定は Service 側でも担保。
        .addFileTypeValidator({
          fileType: /^image\/(png|jpe?g|webp)$/,
          skipMagicNumbersValidation: true,
        })
        .addMaxSizeValidator({ maxSize: 2 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST, fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ): Promise<Task> {
    return this.tasks.setImage(user.userId, id, file);
  }

  /** 添付画像の削除（更新後の Task を返す）。 */
  @Delete(':id/image')
  removeImage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<Task> {
    return this.tasks.removeImage(user.userId, id);
  }
}

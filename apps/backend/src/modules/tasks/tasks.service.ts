import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Task } from '@app/api-client';
import { TaskEntity } from './task.entity';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';

/** MIME → 拡張子。許可外は 400。 */
const EXT_BY_MIME: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * タスクのユースケース（application 層）。
 * 所有者認可（自分のタスクのみ操作可）をここで担保する。DB I/O は Repository に委譲。
 */
@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
    private readonly config: ConfigService,
  ) {}

  async list(userId: string): Promise<Task[]> {
    const rows = await this.tasks.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(TasksService.toContractTask);
  }

  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    TasksService.assertDateOrder(startDate, endDate);
    const entity = this.tasks.create({
      userId,
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? 'todo',
      startDate,
      endDate,
    });
    const saved = await this.tasks.save(entity);
    return TasksService.toContractTask(saved);
  }

  /**
   * タスク作成の DryRun（検証のみ）。DTO 検証は ValidationPipe が済ませている前提で、
   * 新規作成には所有権などの追加業務ルールが無いため、保存せずに通過させる。
   */
  async validateCreate(_userId: string, dto: CreateTaskDto): Promise<void> {
    // DTO 検証に加え、開始≤終了の業務ルールのみ確認する。DB への書き込みは行わない。
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    TasksService.assertDateOrder(startDate, endDate);
  }

  async getById(userId: string, id: string): Promise<Task> {
    const entity = await this.findOwned(userId, id);
    return TasksService.toContractTask(entity);
  }

  async update(userId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    const entity = await this.findOwned(userId, id);
    if (dto.title !== undefined) entity.title = dto.title;
    if (dto.description !== undefined) entity.description = dto.description ?? null;
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.startDate !== undefined) entity.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) entity.endDate = dto.endDate ? new Date(dto.endDate) : null;
    TasksService.assertDateOrder(entity.startDate, entity.endDate);
    const saved = await this.tasks.save(entity);
    return TasksService.toContractTask(saved);
  }

  /**
   * タスク更新の DryRun（検証のみ）。所有権（存在=404 / 非所有=403）を確認するが、
   * 値の反映・保存（save）は行わない。
   */
  async validateUpdate(userId: string, id: string, dto: UpdateTaskDto): Promise<void> {
    const entity = await this.findOwned(userId, id);
    // 更新後に確定する値（指定があれば新値、なければ既存値）で開始≤終了を確認する。
    const startDate = dto.startDate !== undefined ? new Date(dto.startDate) : entity.startDate;
    const endDate =
      dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : entity.endDate;
    TasksService.assertDateOrder(startDate, endDate);
  }

  async remove(userId: string, id: string): Promise<void> {
    const entity = await this.findOwned(userId, id);
    await this.tasks.delete({ id: entity.id });
  }

  /**
   * タスクに画像を添付（1枚・差し替え）。所有権（404/403）を確認し、
   * サーバ生成のファイル名（uuid）で保存する＝クライアント由来の名前は使わない（パストラバーサル防止）。
   * 保存成功後に旧ファイルを削除する。MIME/サイズの検証は Controller の ParseFilePipe で実施済み。
   */
  async setImage(userId: string, id: string, file: Express.Multer.File): Promise<Task> {
    const entity = await this.findOwned(userId, id);
    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Unsupported image type');
    }
    const dir = this.config.getOrThrow<string>('upload.dir');
    await mkdir(dir, { recursive: true });
    const filename = `${entity.id}-${randomUUID()}.${ext}`;
    await writeFile(join(dir, filename), file.buffer);

    const previous = entity.imageUrl;
    entity.imageUrl = `/uploads/${filename}`;
    const saved = await this.tasks.save(entity);
    // 保存が確定してから旧ファイルを掃除する（失敗しても本処理は成功扱い）
    await TasksService.removeStoredFile(dir, previous);
    return TasksService.toContractTask(saved);
  }

  /** タスクの添付画像を削除する。実ファイルも削除する（無ければ無視）。 */
  async removeImage(userId: string, id: string): Promise<Task> {
    const entity = await this.findOwned(userId, id);
    const previous = entity.imageUrl;
    entity.imageUrl = null;
    const saved = await this.tasks.save(entity);
    const dir = this.config.getOrThrow<string>('upload.dir');
    await TasksService.removeStoredFile(dir, previous);
    return TasksService.toContractTask(saved);
  }

  /** 存在しなければ 404、他人のタスクなら 403。 */
  private async findOwned(userId: string, id: string): Promise<TaskEntity> {
    const entity = await this.tasks.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Task not found');
    }
    if (entity.userId !== userId) {
      throw new ForbiddenException('You do not own this task');
    }
    return entity;
  }

  /** 開始・終了が両方あるとき、終了が開始より前なら 400。 */
  private static assertDateOrder(start: Date, end: Date | null): void {
    if (end && end.getTime() < start.getTime()) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
  }

  /**
   * 公開パス（"/uploads/<file>"）に対応する実ファイルを削除する。
   * basename のみを使うため、保存ディレクトリ外への参照は起こり得ない。存在しなくても無視する。
   */
  private static async removeStoredFile(dir: string, publicPath: string | null): Promise<void> {
    if (!publicPath) return;
    try {
      await unlink(join(dir, basename(publicPath)));
    } catch {
      // 既に無い等は無視（掃除の失敗で本処理を巻き戻さない）
    }
  }

  private static toContractTask(entity: TaskEntity): Task {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description ?? undefined,
      status: entity.status,
      startDate: entity.startDate.toISOString(),
      endDate: entity.endDate ? entity.endDate.toISOString() : undefined,
      imageUrl: entity.imageUrl ?? undefined,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

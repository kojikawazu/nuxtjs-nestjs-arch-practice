import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { TaskCreate, TaskStatus } from '@app/api-client';

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'done'];

export class CreateTaskDto implements TaskCreate {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  @IsISO8601()
  startDate!: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  // 関連 URL（任意）。http/https のみ許可し、javascript: 等の危険スキームは 400 で拒否する。
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  url?: string;
}

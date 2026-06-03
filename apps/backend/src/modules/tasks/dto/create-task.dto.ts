import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
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

  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}

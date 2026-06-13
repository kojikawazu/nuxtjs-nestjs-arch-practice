import { PartialType } from '@nestjs/mapped-types';
import type { TaskUpdate } from '@app/api-client';
import { CreateTaskDto } from './create-task.dto';

/** すべてのフィールドを任意にした更新用 DTO（バリデーションルールは継承される）。 */
export class UpdateTaskDto extends PartialType(CreateTaskDto) implements TaskUpdate {}

import { z } from 'zod';
import type { TaskStatus } from '@app/api-client';

const STATUS_VALUES = ['todo', 'in_progress', 'done'] as const satisfies readonly TaskStatus[];

/**
 * 確認画面へ持ち回す入力内容（draft）の zod スキーマ。
 *
 * draft は sessionStorage に文字列として置くため、読み出し時点では**何が入っているか分からない**
 * （ユーザーが devtools で書き換えられるし、古いバージョンの形が残っていることもある）。
 * 境界で検証し、壊れた値は draft なしとして扱うことで、不正な内容が確認画面へ流れないようにする。
 *
 * 画像（File）は sessionStorage に保存できない（文字列のみ）ため含めない。
 */
export const taskDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(STATUS_VALUES),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  url: z.string().optional(),
});

export type TaskDraft = z.infer<typeof taskDraftSchema>;

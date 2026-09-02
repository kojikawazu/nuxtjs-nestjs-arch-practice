import type { H3Event } from 'h3';
import type { TaskStatus } from '@app/api-client';
import { z } from 'zod';
import { isDraftTooLarge } from '~/utils/draftSize';

const DRAFT_COOKIE = 'task_draft';

/**
 * draft Cookie の有効期限（秒）。入力途中の業務データを長く残さないため 30 分で失効させる。
 * 失効後に確認画面へ直アクセスされた場合は draft なしとして入力画面へ戻す。
 */
const DRAFT_MAX_AGE = 60 * 30;

const STATUS_VALUES = ['todo', 'in_progress', 'done'] as const satisfies readonly TaskStatus[];

/**
 * 確認画面へ持ち回す入力内容。画像（File）は Cookie に載せられないため含めない
 * （画像プレビューはクライアント側の useState が保持する）。
 */
export const taskDraftSchema = z.object({
  title: z.string().min(1),
  // 空欄は null で持ち回る（TaskFormValue と同じ意味づけ）。undefined だと JSON 化で
  // キーごと消え、確認画面から戻ったときに「空にした」ことが失われる
  description: z.string().nullable().optional(),
  status: z.enum(STATUS_VALUES),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

export type TaskDraft = z.infer<typeof taskDraftSchema>;

/**
 * draft が Cookie 上限を超えるか。判定は `~/utils/draftSize` に集約し、
 * 入力中に警告するクライアント側と同じ基準で弾く（片方だけ緩いと挙動が食い違うため）。
 */
export function isDraftOverLimit(draft: TaskDraft): boolean {
  return isDraftTooLarge(draft);
}

/** draft を httpOnly Cookie に保存する（クライアント JS からは読めない）。 */
export function setDraftCookie(event: H3Event, draft: TaskDraft): void {
  setCookie(event, DRAFT_COOKIE, JSON.stringify(draft), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: !import.meta.dev,
    maxAge: DRAFT_MAX_AGE,
  });
}

/**
 * Cookie から draft を復元する。
 * 期限切れ・未設定・改竄などで復元できない場合は null を返し、呼び出し側が入力画面へ戻す。
 */
export function readDraftCookie(event: H3Event): TaskDraft | null {
  const raw = getCookie(event, DRAFT_COOKIE);
  if (!raw) return null;
  try {
    const parsed = taskDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    // JSON として壊れている（上限超過による切り捨て等）場合も draft なしとして扱う
    return null;
  }
}

export function clearDraftCookie(event: H3Event): void {
  deleteCookie(event, DRAFT_COOKIE, { path: '/' });
}

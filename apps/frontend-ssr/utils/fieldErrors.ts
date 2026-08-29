import type { ValidationError } from '@app/api-client';

/**
 * サーバの検証失敗（422）に含まれるフィールド別エラーを取り出す。
 *
 * `getErrorMessage` が人間向けの一文を返すのに対し、こちらは UI がフィールドへ割り付けるための構造を返す。
 * `useTasks` が `createError({ data: { errors } })` として載せた値を読む。
 *
 * @param e - catch した未知のエラー
 * @returns フィールド別エラーの配列。422 でない・形が違う場合は空配列
 */
export function getFieldErrors(e: unknown): ValidationError[] {
  const value = (e as { data?: { errors?: unknown } })?.data?.errors;
  if (!Array.isArray(value)) return [];
  // 契約の形として扱えるものだけ通す（境界を越えてきた値は型を信用しない）。
  return value.filter(
    (item): item is ValidationError =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as ValidationError).field === 'string' &&
      Array.isArray((item as ValidationError).messages) &&
      (item as ValidationError).messages.every((m) => typeof m === 'string'),
  );
}

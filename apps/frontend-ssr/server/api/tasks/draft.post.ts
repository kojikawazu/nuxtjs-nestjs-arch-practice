/**
 * 入力内容（draft）を確認画面へ引き渡すために httpOnly Cookie へ保存する。
 *
 * 保存前に backend の DryRun 検証（POST /tasks/validate）を通すことで、確認画面に到達した時点で
 * 「検証通過済み」が保証される。これにより SSR で描画する確認 HTML が常に正しい状態になる。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<unknown>(event);
  const parsed = taskDraftSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: '入力内容の形式が不正です' });
  }
  const draft = parsed.data;

  // 通常はクライアント側の入力検証で先に弾かれる。ここは Cookie が黙って壊れるのを防ぐ最終防御。
  if (isDraftOverLimit(draft)) {
    throw createError({
      statusCode: 413,
      statusMessage: '入力内容が大きすぎます。説明を短くしてください',
    });
  }

  await forwardTaskValidate(event, draft);
  setDraftCookie(event, draft);
  return { ok: true };
});

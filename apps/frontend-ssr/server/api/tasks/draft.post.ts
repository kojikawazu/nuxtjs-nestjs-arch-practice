/**
 * 入力内容（draft）を確認画面へ引き渡すために httpOnly Cookie へ保存する。
 *
 * 形式検証（taskDraftSchema）と Cookie サイズ上限（3500 バイト）をここで担保する。
 * 業務ルール（開始 ≤ 終了 など）の検証は本登録（POST /tasks）が担う。
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

  setDraftCookie(event, draft);
  return { ok: true };
});

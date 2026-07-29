/** draft を破棄する。タスク作成完了後に入力内容を残さないために呼ぶ。 */
export default defineEventHandler((event) => {
  clearDraftCookie(event);
  return { ok: true };
});

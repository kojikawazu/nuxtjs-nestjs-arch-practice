/**
 * 保存済みの draft を返す。確認画面が SSR 実行中に取得するための経路。
 * draft は httpOnly Cookie にあるためクライアント JS からは直接読めず、必ずここを通す。
 *
 * @returns 保存済みの入力内容。未設定・期限切れ・破損時は null
 */
export default defineEventHandler((event) => {
  return { draft: readDraftCookie(event) };
});

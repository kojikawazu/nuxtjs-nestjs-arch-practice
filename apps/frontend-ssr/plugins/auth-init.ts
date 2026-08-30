/**
 * セッション復元（SSR 版）。
 *
 * メモリにアクセストークンが無ければ、httpOnly Cookie のリフレッシュトークンで復元を試みる。
 * サーバ（初期リクエスト）で復元した結果がそのまま SSR の描画とハイドレーションに使われるため、
 * /tasks への直接アクセスでも一覧をサーバ描画できる。サーバ / クライアントの差
 * （backend 直接呼び出しか BFF 経由か）は `useAuth().refresh()` が吸収する。
 */
export default defineNuxtPlugin(async () => {
  const { accessToken, refresh } = useAuth();
  if (accessToken.value === null) {
    try {
      await refresh();
    } catch {
      // 未ログイン: そのまま続行
    }
  }
});

/**
 * アプリ初期化時、メモリにアクセストークンが無ければ
 * httpOnly Cookie のリフレッシュトークンでセッション復元を試みる。
 * （リロード後も「ログイン状態」を維持するため）
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

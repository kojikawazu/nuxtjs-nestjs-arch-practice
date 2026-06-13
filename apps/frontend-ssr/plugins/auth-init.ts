import type { AuthTokens } from '@app/api-client';

const REFRESH_COOKIE = 'refresh_token';

/**
 * セッション復元（SSR 版）。
 *
 * - サーバ（初期リクエスト）: httpOnly の refresh Cookie を読み、backend の /auth/refresh で
 *   アクセストークン＋ユーザーを取得して useState に入れる。これがそのまま SSR の描画と
 *   クライアントへのハイドレーションに使われるため、/tasks 直アクセスでも一覧をサーバ描画できる。
 *   バックエンドはリフレッシュトークンをローテーションするため、新しい値で Cookie を更新する。
 * - クライアント（フォールバック）: メモリにトークンが無ければ BFF 経由で復元を試みる
 *   （SSR を経ない遷移や、ハイドレーション後にトークンが無い場合の保険）。
 */
export default defineNuxtPlugin(async () => {
  const { accessToken, user } = useAuthState();
  if (accessToken.value !== null) return;

  if (import.meta.server) {
    // httpOnly Cookie（BFF と同じ属性）。読み取りはサーバのみ。書き戻しで Set-Cookie を返す。
    const refreshCookie = useCookie(REFRESH_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: !import.meta.dev,
      maxAge: 60 * 60 * 24 * 7,
    });
    if (!refreshCookie.value) return;

    const config = useRuntimeConfig();
    try {
      const tokens = await $fetch<AuthTokens>(`${config.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        body: { refreshToken: refreshCookie.value },
      });
      accessToken.value = tokens.accessToken;
      user.value = tokens.user;
      // ローテーションされた新しいリフレッシュトークンを Cookie に書き戻す
      refreshCookie.value = tokens.refreshToken;
    } catch {
      // 無効/期限切れ: Cookie を消して未ログインとして続行
      refreshCookie.value = null;
    }
    return;
  }

  // クライアントフォールバック（BFF 経由）
  try {
    await useAuth().refresh();
  } catch {
    // 未ログイン: そのまま続行
  }
});

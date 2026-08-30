import type { AuthTokens, LoginRequest, RegisterRequest, User } from '@app/api-client';

interface AuthResponse {
  accessToken: string;
  user: User;
}

const REFRESH_COOKIE = 'refresh_token';

/**
 * 進行中のリフレッシュを Nuxt アプリ単位で共有するための入れ物。
 * モジュール変数（単なる `let`）にすると SSR で全リクエストが同じ値を見てしまうため、
 * リクエストごとに別インスタンスになる nuxtApp をキーにする。
 */
const inFlightRefresh = new WeakMap<object, Promise<boolean>>();

/**
 * httpOnly のリフレッシュ Cookie。BFF (`server/utils/auth-bff.ts`) と同じ属性で扱う。
 * SSR のサーバ側からのみ読み書きする（クライアント JS からは見えない）。
 * @returns リフレッシュトークンの Cookie ref
 */
function useRefreshCookie() {
  return useCookie<string | null>(REFRESH_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: !import.meta.dev,
    maxAge: 60 * 60 * 24 * 7,
  });
}

/**
 * 認証ユースケース。Nitro BFF (/api/auth/*) を経由し、
 * リフレッシュトークンは httpOnly Cookie で、アクセストークンはメモリで扱う。
 */
export function useAuth() {
  const { accessToken, user } = useAuthState();
  const isAuthenticated = computed(() => accessToken.value !== null);
  const config = useRuntimeConfig();
  const nuxtApp = useNuxtApp();

  function applySession(res: AuthResponse): void {
    accessToken.value = res.accessToken;
    user.value = res.user;
  }

  async function register(body: RegisterRequest): Promise<void> {
    applySession(await $fetch<AuthResponse>('/api/auth/register', { method: 'POST', body }));
  }

  async function login(body: LoginRequest): Promise<void> {
    applySession(await $fetch<AuthResponse>('/api/auth/login', { method: 'POST', body }));
  }

  /**
   * リフレッシュトークンでセッション（アクセストークン＋ユーザー）を復元する。
   * サーバ（SSR）では BFF を経由せず backend を直接呼び、ローテーションされた新しい
   * リフレッシュトークンを自分で Cookie へ書き戻す。内部 $fetch で BFF を呼ぶと
   * BFF が付ける Set-Cookie がブラウザ応答に載らず、回転後のトークンを取りこぼすため。
   */
  async function refresh(): Promise<void> {
    if (import.meta.server) {
      const cookie = useRefreshCookie();
      if (!cookie.value) {
        throw createError({ statusCode: 401, statusMessage: 'No refresh token' });
      }
      try {
        const tokens = await $fetch<AuthTokens>(`${config.apiBaseUrl}/auth/refresh`, {
          method: 'POST',
          body: { refreshToken: cookie.value },
        });
        accessToken.value = tokens.accessToken;
        user.value = tokens.user;
        cookie.value = tokens.refreshToken;
      } catch (e) {
        // 無効/期限切れ: 使い回さないよう Cookie を落としてから呼び出し側へ返す
        cookie.value = null;
        throw e;
      }
      return;
    }
    applySession(await $fetch<AuthResponse>('/api/auth/refresh', { method: 'POST' }));
  }

  /**
   * リフレッシュしてセッションを更新する。更新できなければセッションを終了する。
   * 進行中の 1 本を共有するため、複数の API が同時に 401 になっても走るのは 1 回だけ。
   * 並行してリフレッシュすると backend のトークンローテーションと競合し、
   * 後発の呼び出しが消費済みトークンで失敗するため。後始末（`endSession`）も
   * この共有 Promise に載せることで、失敗を観測したのが何本でも 1 回で済む。
   * @returns セッションを更新できたら true、更新できず終了したら false
   */
  function renewSession(): Promise<boolean> {
    const pending = inFlightRefresh.get(nuxtApp);
    if (pending) return pending;

    const started = refresh().then(
      () => true,
      () => endSession().then(() => false),
    );
    inFlightRefresh.set(nuxtApp, started);
    // 完了後は捨てる（次に 401 が来たら改めてリフレッシュできるようにする）
    void started.finally(() => inFlightRefresh.delete(nuxtApp));
    return started;
  }

  /**
   * リフレッシュ不能と判明したときにセッションを終了する。
   * メモリのトークンだけでなく httpOnly Cookie も消さないと、次のリロードで
   * 無効なリフレッシュトークンによる復元を延々と試み続けることになる。
   * Cookie 破棄が失敗しても、ローカルのセッション破棄は必ず成立させる。
   */
  async function endSession(): Promise<void> {
    accessToken.value = null;
    user.value = null;
    if (import.meta.server) {
      // サーバでは BFF を通さず自分で Cookie を落とす（refresh と同じ理由）
      useRefreshCookie().value = null;
      return;
    }
    try {
      await $fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore: Cookie 破棄に失敗してもログイン導線は止めない
    }
  }

  async function logout(): Promise<void> {
    const headers: Record<string, string> = accessToken.value
      ? { Authorization: `Bearer ${accessToken.value}` }
      : {};
    await $fetch('/api/auth/logout', { method: 'POST', headers });
    accessToken.value = null;
    user.value = null;
  }

  return {
    accessToken,
    user,
    isAuthenticated,
    register,
    login,
    refresh,
    renewSession,
    logout,
  };
}

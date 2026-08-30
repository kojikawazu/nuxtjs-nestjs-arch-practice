import type { LoginRequest, RegisterRequest, User } from '@app/api-client';

interface AuthResponse {
  accessToken: string;
  user: User;
}

/**
 * 進行中のリフレッシュを Nuxt アプリ単位で共有するための入れ物。
 * モジュール変数（単なる `let`）にすると SSR で全リクエストが同じ値を見てしまうため、
 * リクエストごとに別インスタンスになる nuxtApp をキーにする。
 */
const inFlightRefresh = new WeakMap<object, Promise<boolean>>();

/**
 * 認証ユースケース。Nitro BFF (/api/auth/*) を経由し、
 * リフレッシュトークンは httpOnly Cookie で、アクセストークンはメモリで扱う。
 */
export function useAuth() {
  const { accessToken, user } = useAuthState();
  const isAuthenticated = computed(() => accessToken.value !== null);
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

  async function refresh(): Promise<void> {
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
   * Cookie 破棄（BFF 呼び出し）が失敗しても、ローカルのセッション破棄は必ず成立させる。
   */
  async function endSession(): Promise<void> {
    accessToken.value = null;
    user.value = null;
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

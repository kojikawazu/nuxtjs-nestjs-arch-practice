import type { DryRunResult, LoginRequest, RegisterRequest, User } from '@app/api-client';

interface AuthResponse {
  accessToken: string;
  user: User;
}

/**
 * 認証ユースケース。Nitro BFF (/api/auth/*) を経由し、
 * リフレッシュトークンは httpOnly Cookie で、アクセストークンはメモリで扱う。
 */
export function useAuth() {
  const { accessToken, user } = useAuthState();
  const isAuthenticated = computed(() => accessToken.value !== null);

  function applySession(res: AuthResponse): void {
    accessToken.value = res.accessToken;
    user.value = res.user;
  }

  async function register(body: RegisterRequest): Promise<void> {
    applySession(await $fetch<AuthResponse>('/api/auth/register', { method: 'POST', body }));
  }

  /** 登録の事前検証（DryRun・保存しない）。検証 NG は例外として伝播する。 */
  async function validateRegister(body: RegisterRequest): Promise<void> {
    await $fetch<DryRunResult>('/api/auth/register/validate', { method: 'POST', body });
  }

  async function login(body: LoginRequest): Promise<void> {
    applySession(await $fetch<AuthResponse>('/api/auth/login', { method: 'POST', body }));
  }

  async function refresh(): Promise<void> {
    applySession(await $fetch<AuthResponse>('/api/auth/refresh', { method: 'POST' }));
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
    validateRegister,
    login,
    refresh,
    logout,
  };
}

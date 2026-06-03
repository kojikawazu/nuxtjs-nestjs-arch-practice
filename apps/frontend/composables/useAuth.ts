import type { LoginRequest, RegisterRequest, User } from '@app/api-client';

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

  return { accessToken, user, isAuthenticated, register, login, refresh, logout };
}

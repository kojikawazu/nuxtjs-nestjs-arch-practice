import { describe, expect, it } from 'vitest';
import { registerEndpoint } from '@nuxt/test-utils/runtime';

/**
 * useAuth の単体テスト。
 * Nitro BFF (/api/auth/*) を registerEndpoint でモックし、
 * 「アクセストークン/ユーザーがメモリに入る」ロジックを検証する。
 */
const fakeUser = {
  id: 'u1',
  email: 'taro@example.com',
  displayName: 'Taro',
  createdAt: '2026-01-01T00:00:00.000Z',
};

registerEndpoint('/api/auth/login', {
  method: 'POST',
  handler: () => ({ accessToken: 'access-xyz', user: fakeUser }),
});

registerEndpoint('/api/auth/logout', {
  method: 'POST',
  handler: () => ({ ok: true }),
});

describe('useAuth', () => {
  it('正常系: login でアクセストークンとユーザーがメモリに入る', async () => {
    const { login, accessToken, user, isAuthenticated } = useAuth();

    await login({ email: 'taro@example.com', password: 'password123' });

    expect(accessToken.value).toBe('access-xyz');
    expect(user.value?.email).toBe('taro@example.com');
    expect(isAuthenticated.value).toBe(true);
  });

  it('正常系: logout でメモリのセッションがクリアされる', async () => {
    const { login, logout, accessToken, user, isAuthenticated } = useAuth();
    await login({ email: 'taro@example.com', password: 'password123' });

    await logout();

    expect(accessToken.value).toBeNull();
    expect(user.value).toBeNull();
    expect(isAuthenticated.value).toBe(false);
  });
});

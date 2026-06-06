import { describe, expect, it } from 'vitest';
import { registerEndpoint } from '@nuxt/test-utils/runtime';
import { createError, readBody } from 'h3';

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

// DryRun（検証のみ）。重複メールのときだけ 409 を返し、それ以外は valid:true。
registerEndpoint('/api/auth/register/validate', {
  method: 'POST',
  handler: async (event) => {
    const body = await readBody<{ email?: string }>(event);
    if (body?.email === 'dup@example.com') {
      throw createError({ statusCode: 409, statusMessage: 'Email already registered' });
    }
    return { valid: true };
  },
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

  describe('validateRegister（DryRun・保存しない）', () => {
    it('正常系: 検証が通ってもセッション（メモリ）は変化しない', async () => {
      const { validateRegister, accessToken, user } = useAuth();

      await expect(
        validateRegister({ email: 'new@example.com', password: 'password123', displayName: 'New' }),
      ).resolves.toBeUndefined();

      // 検証だけなのでログイン状態にはならない
      expect(accessToken.value).toBeNull();
      expect(user.value).toBeNull();
    });

    it('準正常系: 重複メールは 409 エラーを投げる', async () => {
      const { validateRegister } = useAuth();

      await expect(
        validateRegister({ email: 'dup@example.com', password: 'password123', displayName: 'Dup' }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });
});

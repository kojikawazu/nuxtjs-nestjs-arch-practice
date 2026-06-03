import type { H3Event } from 'h3';
import type { AuthTokens } from '@app/api-client';

const REFRESH_COOKIE = 'refresh_token';

/** リフレッシュトークンを httpOnly Cookie に保存する（クライアント JS からは読めない）。 */
export function setRefreshCookie(event: H3Event, token: string): void {
  setCookie(event, REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: !import.meta.dev,
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function getRefreshCookie(event: H3Event): string | undefined {
  return getCookie(event, REFRESH_COOKIE);
}

export function clearRefreshCookie(event: H3Event): void {
  deleteCookie(event, REFRESH_COOKIE, { path: '/' });
}

/**
 * backend の認証エンドポイントへ転送し、AuthTokens を取得する。
 * backend のエラーステータス/メッセージはクライアントへそのまま伝播させる。
 */
export async function forwardAuth(
  path: string,
  body: Record<string, unknown>,
): Promise<AuthTokens> {
  const config = useRuntimeConfig();
  try {
    return await $fetch<AuthTokens>(`${config.apiBaseUrl}${path}`, { method: 'POST', body });
  } catch (e) {
    const err = e as { status?: number; data?: { message?: string } };
    throw createError({
      statusCode: err.status ?? 502,
      statusMessage: err.data?.message ?? 'Authentication failed',
    });
  }
}

import { createApiClient, type ApiClient } from '@app/api-client';

/**
 * 生成された型安全クライアント (openapi-fetch) をラップする。
 * メモリ上のアクセストークンをリクエスト時に Authorization ヘッダへ注入する。
 * fetch を差し替え可能にしているため、テストでは MSW がこの fetch を横取りできる。
 */
export function useApiClient(): ApiClient {
  const config = useRuntimeConfig();
  const { accessToken } = useAuthState();

  return createApiClient({
    baseUrl: config.public.apiBaseUrl,
    fetch(request: Request) {
      if (accessToken.value) {
        request.headers.set('Authorization', `Bearer ${accessToken.value}`);
      }
      return globalThis.fetch(request);
    },
  });
}

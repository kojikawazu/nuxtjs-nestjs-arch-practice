/**
 * 認証付き fetch を組み立てる。
 *
 * - メモリのアクセストークンを Authorization ヘッダへ注入する。
 * - 401 を受けたときだけ、1 回リフレッシュしてから同じリクエストを再試行する
 *   （アクセストークンは短命なため、期限切れのたびに利用者へリロードを強いないため）。
 * - リフレッシュできなければセッションを破棄してログインへ戻す。
 *
 * `Request` 単位のラッパにしているのは、openapi-fetch（`useApiClient`）と
 * multipart 用の素の fetch（`useTasks`）の両方から同じ挙動で使えるようにするため。
 * @returns Request を受け取り Response を返す fetch 関数
 */
export function useAuthedFetch(): (request: Request) => Promise<Response> {
  const { accessToken } = useAuthState();
  const { renewSession } = useAuth();
  // 返した fetch は setup を抜けたあと（await をまたいだあと）に走るため、その時点では
  // Nuxt context が失われている。navigateTo 等を呼べるよう setup 中に捕まえておく。
  const nuxtApp = useNuxtApp();

  const send = (request: Request): Promise<Response> => {
    if (accessToken.value) {
      request.headers.set('Authorization', `Bearer ${accessToken.value}`);
    }
    return globalThis.fetch(request);
  };

  return async (request: Request): Promise<Response> => {
    // Request の body は一度しか読めないため、送信前に再試行用の複製を取っておく。
    const retryable = request.clone();
    const response = await send(request);
    if (response.status !== 401) return response;

    // renewSession は失敗時のセッション破棄まで担う。残るログイン導線だけをここで行う。
    const renewed = await nuxtApp.runWithContext(() => renewSession());
    if (!renewed) {
      await nuxtApp.runWithContext(() => navigateTo('/login'));
      return response;
    }
    // 再試行は 1 回だけ。ここでも 401 なら本当に権限が無いので、そのまま返す。
    return send(retryable);
  };
}

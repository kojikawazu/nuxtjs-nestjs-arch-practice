import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';

/**
 * 全テスト共通の MSW サーバ。
 * 未登録のリクエストは bypass するので、registerEndpoint(Nitro) を使うテストとも共存できる。
 * 各テストは server.use(...) でハンドラを上書きする。
 */
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

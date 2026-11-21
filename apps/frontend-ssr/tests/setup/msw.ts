import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw-server';

/**
 * MSW サーバのライフサイクルを登録する setupFiles。
 * 未登録のリクエストは bypass するので、registerEndpoint(Nitro) を使うテストとも共存できる。
 * spec はこのファイルではなく `./msw-server` から `server` を import する（ここを import するとフックが二重登録される）。
 */
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

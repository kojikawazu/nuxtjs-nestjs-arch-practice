import { setupServer } from 'msw/node';

/**
 * 全テスト共通の MSW サーバ。各テストは `server.use(...)` でハンドラを上書きする。
 * ライフサイクル（listen / resetHandlers / close）は setupFiles の `msw.ts` が担い、ここは生成だけを行う。
 */
type MswServer = ReturnType<typeof setupServer>;

// globalThis に 1 つだけ保持する理由: @nuxt/test-utils（4.3〜）は setupFiles の後に `vi.resetModules()` を呼ぶため、
// spec からの import でこのモジュールが再評価される。素の `export const server = setupServer()` だと
// setup 側と spec 側で別インスタンスになり、MSW のインターセプタ（プロセス共有）に 2 台ぶら下がって
// 1 リクエストでハンドラが 2 回走る（呼び出し回数を数えるテストが壊れる）。
const holder = globalThis as typeof globalThis & { __mswServer?: MswServer };

export const server: MswServer = (holder.__mswServer ??= setupServer());

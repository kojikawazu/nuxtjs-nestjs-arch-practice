import { defineConfig, devices } from '@playwright/test';

/**
 * E2E（chromium）。webServer で backend と frontend(本番ビルド出力) を自動起動する。
 * - 既定: backend は Docker 不要の DB_TYPE=better-sqlite3 / :memory:（速い E2E スモーク）。
 * - `SCENARIO_DB=mysql`: 本番相当のシナリオとして backend を mysql-test の taskdb_e2e に繋ぐ
 *   （事前に `make test-scenario-mysql` が mysql-test を起動する）。
 */
const backendDbEnv: Record<string, string> =
  process.env.SCENARIO_DB === 'mysql'
    ? {
        DB_TYPE: 'mysql',
        DB_HOST: '127.0.0.1',
        DB_PORT: '3307',
        DB_USERNAME: 'taskuser',
        DB_PASSWORD: 'taskpassword',
        DB_DATABASE: 'taskdb_e2e',
        DB_SYNCHRONIZE: 'true',
      }
    : {
        DB_TYPE: 'better-sqlite3',
        DB_DATABASE: ':memory:',
        DB_SYNCHRONIZE: 'true',
      };

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @app/backend-layered dev',
      cwd: '../../',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...backendDbEnv,
        BACKEND_PORT: '3001',
        // 起動時検証（32 文字以上・サンプル値でない・access と refresh が別値）を満たす値にする
        JWT_ACCESS_SECRET: 'e2e-access-secret-0123456789abcdef',
        JWT_REFRESH_SECRET: 'e2e-refresh-secret-0123456789abcdef',
        JWT_ACCESS_EXPIRES_IN: '900s',
        JWT_REFRESH_EXPIRES_IN: '7d',
      },
    },
    {
      // dev サーバ（Vite 7 と非互換）を避け、本番ビルド出力を起動する。
      // test:e2e スクリプトで事前に `nuxt build` 済みであることを前提とする。
      command: 'node .output/server/index.mjs',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: '3000',
        NUXT_API_BASE_URL: 'http://localhost:3001',
        NUXT_PUBLIC_API_BASE_URL: 'http://localhost:3001',
      },
    },
  ],
});

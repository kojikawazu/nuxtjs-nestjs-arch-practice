import { defineConfig, devices } from '@playwright/test';

/**
 * E2E（chromium）。webServer で backend(SQLite) と frontend(Nuxt dev) を自動起動する。
 * backend は Docker 不要で動くよう DB_TYPE=better-sqlite3 / :memory: を使う。
 */
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
      command: 'pnpm --filter @app/backend dev',
      cwd: '../../',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DB_TYPE: 'better-sqlite3',
        DB_DATABASE: ':memory:',
        DB_SYNCHRONIZE: 'true',
        BACKEND_PORT: '3001',
        JWT_ACCESS_SECRET: 'e2e-access-secret',
        JWT_REFRESH_SECRET: 'e2e-refresh-secret',
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

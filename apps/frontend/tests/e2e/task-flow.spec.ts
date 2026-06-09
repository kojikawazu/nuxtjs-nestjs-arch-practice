import { expect, test } from '@playwright/test';

/**
 * 登録 → 作成(confirm) → 一覧 → 詳細 → 編集(confirm) → 削除(確認) の通しシナリオ。
 * 実スタック（Nuxt + NestJS + SQLite）に対して、ユーザー視点で検証する。
 */
test('タスク管理の一連フロー', async ({ page }) => {
  // 再実行でメール衝突しないよう一意化
  const email = `e2e+${Date.now()}@example.com`;

  // --- 新規登録 → /tasks へ ---
  await page.goto('/register');
  await page.getByTestId('register-name').fill('E2E User');
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill('password123');
  await page.getByTestId('register-submit').click();

  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByTestId('tasks-empty')).toBeVisible();

  // --- 新規作成（フォーム → confirm → 確定）---
  await page.getByTestId('new-task-link').click();
  await page.getByTestId('task-title').fill('牛乳を買う');
  await page.getByTestId('task-description').fill('2本');
  await page.getByTestId('task-url').fill('https://example.com/recipe');
  // flatpickr（allowInput）に開始日を入力。開始は必須。
  await page.getByTestId('task-start-date').fill('2026-06-10');
  await page.getByTestId('task-submit').click();

  await expect(page.getByTestId('confirm-step')).toBeVisible();
  await expect(page.getByTestId('confirm-title')).toHaveText('牛乳を買う');
  await expect(page.getByTestId('confirm-start')).toHaveText('2026-06-10');
  // 確認画面に URL プレビュー（安全なリンク）が表示される
  await expect(page.getByTestId('url-preview-link')).toHaveAttribute(
    'href',
    'https://example.com/recipe',
  );
  // confirm 進入時にサーバ側 DryRun 検証が走り、通過すると作成できる
  await expect(page.getByTestId('validation-ok')).toBeVisible();
  await page.getByTestId('confirm-create').click();

  // --- 詳細表示 ---
  await expect(page.getByTestId('detail-title')).toHaveText('牛乳を買う');
  await expect(page.getByTestId('detail-start-date')).toContainText('2026-06-10');
  // 詳細でも URL が安全なリンク（target=_blank / rel=noopener）として表示される
  const urlLink = page.getByTestId('detail-url').getByTestId('url-preview-link');
  await expect(urlLink).toHaveAttribute('href', 'https://example.com/recipe');
  await expect(urlLink).toHaveAttribute('rel', 'noopener noreferrer');

  // --- 一覧に表示される ---
  await page.goto('/tasks');
  await expect(page.getByTestId('task-list')).toContainText('牛乳を買う');

  // --- 編集（status を done に, フォーム → confirm → 確定）---
  await page.getByTestId('task-card').first().click();
  await page.getByTestId('edit-link').click();
  await page.getByTestId('task-status').selectOption('done');
  await page.getByTestId('task-submit').click();
  await expect(page.getByTestId('confirm-step')).toBeVisible();
  await expect(page.getByTestId('validation-ok')).toBeVisible();
  await page.getByTestId('confirm-update').click();

  await expect(page.getByTestId('detail-title')).toBeVisible();
  await expect(page.getByTestId('status-badge')).toHaveText('完了');

  // --- 削除（確認ダイアログ → 実行）---
  await page.getByTestId('delete-button').click();
  await expect(page.getByTestId('confirm-dialog')).toBeVisible();
  await page.getByTestId('confirm-ok').click();

  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByTestId('tasks-empty')).toBeVisible();
});

test('画像を添付して作成すると、詳細で画像が表示・ロードされる', async ({ page }) => {
  const email = `e2e-img+${Date.now()}@example.com`;

  await page.goto('/register');
  await page.getByTestId('register-name').fill('Image User');
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill('password123');
  await page.getByTestId('register-submit').click();
  await expect(page).toHaveURL(/\/tasks$/);

  await page.getByTestId('new-task-link').click();
  await page.getByTestId('task-title').fill('画像つきタスク');
  await page.getByTestId('task-start-date').fill('2026-06-10');

  // 1x1 透過 PNG をアップロード
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  await page
    .getByTestId('task-image-input')
    .setInputFiles({ name: 'pic.png', mimeType: 'image/png', buffer: png });
  // 選択直後にプレビューが出る
  await expect(page.getByTestId('task-image-preview')).toBeVisible();

  await page.getByTestId('task-submit').click();
  // 確認画面でも選択画像のプレビューが表示される
  await expect(page.getByTestId('confirm-image')).toBeVisible();
  await expect(page.getByTestId('validation-ok')).toBeVisible();
  await page.getByTestId('confirm-create').click();

  // 詳細で画像が表示され、実際にロードできる（静的配信まで通っている）
  const img = page.getByTestId('detail-image');
  await expect(img).toBeVisible();
  await expect
    .poll(async () => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
});

test('未認証では /tasks から /login へリダイレクトされる', async ({ page }) => {
  await page.goto('/tasks');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId('login-form')).toBeVisible();
});

import { expect, test } from '@playwright/test';

/**
 * 確認画面が「本当に SSR されているか」を検証する e2e。
 *
 * SPA 版（frontend-spa）の確認画面は同一ページ内の state 切替なので、リロードすれば内容は消え、
 * 初回 HTML にも確認内容は載らない。SSR 版は draft を httpOnly Cookie に持ちサーバで描画するため、
 * リロードしても残り、JS を実行しない素の HTML にも内容が含まれる——その差をここで固定する。
 */

async function registerAndOpenConfirm(page: import('@playwright/test').Page, tag: string) {
  const email = `ssr-confirm-${tag}+${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByTestId('register-name').fill('SSR User');
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill('password123');
  await page.getByTestId('register-submit').click();
  await expect(page).toHaveURL(/\/tasks$/);

  await page.getByTestId('new-task-link').click();
  await page.getByTestId('task-title').fill('牛乳を買う');
  await page.getByTestId('task-description').fill('スーパーで2本');
  await page.getByTestId('task-start-date').fill('2026-06-10');
  await page.getByTestId('task-submit').click();
}

test('正常系: 確認画面は独立した URL を持ち、リロードしても内容が残る', async ({ page }) => {
  await registerAndOpenConfirm(page, 'reload');

  await expect(page).toHaveURL(/\/tasks\/new\/confirm$/);
  await expect(page.getByTestId('confirm-title')).toHaveText('牛乳を買う');

  await page.reload();

  // draft はサーバ側 Cookie にあるため、リロード後もサーバが同じ内容を描画する
  await expect(page.getByTestId('confirm-title')).toHaveText('牛乳を買う');
  await expect(page.getByTestId('confirm-start')).toHaveText('2026-06-10');
});

test('正常系: 確認内容が初回 HTML に含まれる（JS を実行しなくても読める）', async ({ page }) => {
  await registerAndOpenConfirm(page, 'html');
  await expect(page.getByTestId('confirm-title')).toBeVisible();

  // ブラウザの Cookie を共有したまま素の GET を投げ、返却 HTML そのものを検証する。
  // JS は一切実行されないため、ここに内容があれば確実にサーバが描画している。
  const res = await page.request.get('/tasks/new/confirm');
  const html = await res.text();

  expect(res.status()).toBe(200);
  expect(html).toContain('牛乳を買う');
  expect(html).toContain('スーパーで2本');
  expect(html).toContain('data-testid="confirm-step"');
});

test('正常系: 「修正する」で入力画面へ戻ると、入力値が復元される', async ({ page }) => {
  await registerAndOpenConfirm(page, 'back');

  await page.getByTestId('confirm-back').click();

  await expect(page).toHaveURL(/\/tasks\/new$/);
  await expect(page.getByTestId('task-title')).toHaveValue('牛乳を買う');
  await expect(page.getByTestId('task-description')).toHaveValue('スーパーで2本');
  await expect(page.getByTestId('task-start-date')).toHaveValue('2026-06-10');
});

test('準正常系: draft が無い状態で確認画面へ直アクセスすると入力画面へ戻される', async ({
  page,
}) => {
  const email = `ssr-confirm-direct+${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByTestId('register-name').fill('Direct User');
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill('password123');
  await page.getByTestId('register-submit').click();
  await expect(page).toHaveURL(/\/tasks$/);

  await page.goto('/tasks/new/confirm');

  await expect(page).toHaveURL(/\/tasks\/new$/);
  await expect(page.getByTestId('task-form')).toBeVisible();
});

test('準正常系: Cookie 上限を超える入力は、submit を待たず入力中にエラー表示される', async ({
  page,
}) => {
  const email = `ssr-confirm-large+${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByTestId('register-name').fill('Large User');
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill('password123');
  await page.getByTestId('register-submit').click();
  await expect(page).toHaveURL(/\/tasks$/);

  await page.getByTestId('new-task-link').click();
  await page.getByTestId('task-title').fill('長い説明のタスク');
  await page.getByTestId('task-start-date').fill('2026-06-10');
  // フォームの文字数上限は 2000 文字だが、日本語は URL エンコードで 1 文字 9 バイトに膨らむため
  // 1000 文字でも Cookie 上限（3500 バイト）を超える。文字数検証だけでは検出できない領域。
  await page.getByTestId('task-description').fill('あ'.repeat(1000));

  // submit を押す前の時点でエラーが出る（413 を踏んでから気づく体験にしない）
  await expect(page.getByTestId('error-payload-size')).toBeVisible();

  await page.getByTestId('task-submit').click();
  await expect(page).toHaveURL(/\/tasks\/new$/);

  // 説明を上限内まで縮めるとエラーが消え、確認画面へ進める
  await page.getByTestId('task-description').fill('あ'.repeat(100));
  await expect(page.getByTestId('error-payload-size')).toBeHidden();
  await page.getByTestId('task-submit').click();

  await expect(page).toHaveURL(/\/tasks\/new\/confirm$/);
  await expect(page.getByTestId('confirm-title')).toHaveText('長い説明のタスク');
});

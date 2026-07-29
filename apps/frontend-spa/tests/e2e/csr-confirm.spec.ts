import { expect, test } from '@playwright/test';

/**
 * CSR 確認画面（draft = sessionStorage）の性質を検証する e2e。
 *
 * SSR 版（frontend-ssr）は draft を httpOnly Cookie に持つため、確認内容は初回 HTML に載り、
 * Cookie がタブ間で共有されるので別タブでも復元できる。sessionStorage 版はどちらも成り立たない
 * ——「リロードには耐えるが、タブは越えない」という中間の性質を持つ。その差をここで固定する。
 */

async function registerAndOpenConfirm(page: import('@playwright/test').Page, tag: string) {
  const email = `csr-confirm-${tag}+${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByTestId('register-name').fill('CSR User');
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

  // draft は sessionStorage にあるため、同じタブなら再読み込みしても残る
  await expect(page.getByTestId('confirm-title')).toHaveText('牛乳を買う');
  await expect(page.getByTestId('confirm-start')).toHaveText('2026-06-10');
});

test('正常系: 確認内容は初回 HTML には含まれない（クライアントが描画する）', async ({ page }) => {
  await registerAndOpenConfirm(page, 'html');
  await expect(page.getByTestId('confirm-title')).toBeVisible();

  // JS を実行しない素の GET。sessionStorage はサーバへ送られないため確認内容は載らない
  // （SSR 版はここに内容が含まれる。これが 2 方式の決定的な差）。
  const res = await page.request.get('/tasks/new/confirm');
  const html = await res.text();

  expect(html).not.toContain('牛乳を買う');
  expect(html).not.toContain('スーパーで2本');
});

test('準正常系: 別タブで確認画面を開くと draft が無く入力画面へ戻される', async ({
  page,
  context,
}) => {
  await registerAndOpenConfirm(page, 'tab');
  await expect(page.getByTestId('confirm-title')).toBeVisible();

  // sessionStorage はタブ単位。Cookie 方式なら復元できるが、この方式では復元できない。
  const another = await context.newPage();
  await another.goto('/tasks/new/confirm');

  await expect(another).toHaveURL(/\/tasks\/new$/);
  await expect(another.getByTestId('task-form')).toBeVisible();
  await another.close();
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
  const email = `csr-confirm-direct+${Date.now()}@example.com`;
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

test('正常系: 作成が完了すると draft が破棄され、再度の新規作成は空フォームになる', async ({
  page,
}) => {
  await registerAndOpenConfirm(page, 'clear');

  await page.getByTestId('confirm-create').click();
  await expect(page.getByTestId('detail-title')).toHaveText('牛乳を買う');

  // 作成済みの内容が次の新規作成に残っていてはいけない
  await page.goto('/tasks/new');
  await expect(page.getByTestId('task-title')).toHaveValue('');
  await expect(page.getByTestId('task-description')).toHaveValue('');
});

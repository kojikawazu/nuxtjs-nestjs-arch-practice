import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-app.factory';

/**
 * 認証フローの e2e テスト（実スタック / インメモリ DB / HTTP 経由）。
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  const credentials = {
    email: 'taro@example.com',
    password: 'password123',
    displayName: 'Taro',
  };

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('正常系: 登録するとトークンとユーザー情報が返る（201）', async () => {
    const res = await http.post('/auth/register').send(credentials).expect(201);

    expect(res.body.user.email).toBe(credentials.email);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('準正常系: 同じメールの二重登録は 409', async () => {
    const res = await http.post('/auth/register').send(credentials).expect(409);
    expect(res.body.statusCode).toBe(409);
  });

  it('異常系: 短すぎるパスワードは 400（バリデーション）', async () => {
    await http
      .post('/auth/register')
      .send({ email: 'a@example.com', password: 'short', displayName: 'A' })
      .expect(400);
  });

  it('正常系: 正しい資格情報でログインできる（200）', async () => {
    const res = await http
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('異常系: パスワード不一致は 401', async () => {
    await http
      .post('/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' })
      .expect(401);
  });

  it('正常系→準正常系: refresh は新トークンを返し、使用済みトークンは再利用不可（ローテーション）', async () => {
    const login = await http
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);
    const oldRefresh = login.body.refreshToken as string;

    const refreshed = await http
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(200);
    expect(refreshed.body.refreshToken).not.toBe(oldRefresh);

    // 回転済みの古いトークンはもう使えない
    await http.post('/auth/refresh').send({ refreshToken: oldRefresh }).expect(401);
  });

  it('異常系: 認証なしで保護ルートにアクセスすると 401', async () => {
    await http.get('/tasks').expect(401);
  });

  describe('POST /auth/register/validate（DryRun・保存しない）', () => {
    it('正常系: 未登録メールは 200 { valid: true } を返し、実際には作成されない', async () => {
      const email = 'dryrun@example.com';

      const res = await http
        .post('/auth/register/validate')
        .send({ email, password: 'password123', displayName: 'Dry' })
        .expect(200);
      expect(res.body).toEqual({ valid: true });

      // 検証では書き込まれていないので、同じメールで本登録が成功する（= 409 にならない）
      await http
        .post('/auth/register')
        .send({ email, password: 'password123', displayName: 'Dry' })
        .expect(201);
    });

    it('準正常系: 既に登録済みのメールは 409', async () => {
      const res = await http.post('/auth/register/validate').send(credentials).expect(409);
      expect(res.body.statusCode).toBe(409);
    });

    it('異常系: 短すぎるパスワードは 400（バリデーション）', async () => {
      await http
        .post('/auth/register/validate')
        .send({ email: 'b@example.com', password: 'short', displayName: 'B' })
        .expect(400);
    });
  });
});

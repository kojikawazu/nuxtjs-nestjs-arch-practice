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

  // bcrypt は 72 バイトを超えた分を静かに切り捨てる。上限を文字数で見ていると、
  // 「あ」24 文字（72 バイト）で登録したあと 25 文字目を足した別のパスワードでもログインできてしまう。
  describe('パスワードの上限は UTF-8 72 バイト（bcrypt の切り捨て境界）', () => {
    const BOUNDARY = 'あ'.repeat(24); // 24 文字 = 72 バイト
    const OVER = `${BOUNDARY}x`; // 25 文字 = 73 バイト（先頭 72 バイトは BOUNDARY と同一）
    const email = 'bytes@example.com';

    it('正常系: 72 バイトちょうどのマルチバイトパスワードで登録できる（文字数では 24 文字）', async () => {
      const res = await http
        .post('/auth/register')
        .send({ email, password: BOUNDARY, displayName: 'Bytes' })
        .expect(201);

      expect(res.body.user.email).toBe(email);
    });

    it('異常系: 73 バイトの登録は 422（errors に password）', async () => {
      const res = await http
        .post('/auth/register')
        .send({ email: 'over@example.com', password: OVER, displayName: 'Over' })
        .expect(422);

      expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual(['password']);
    });

    it('異常系: 先頭 72 バイトが同じ別パスワードではログインできない（bcrypt の切り捨てを突けない）', async () => {
      // 前段の登録済みユーザー（password = BOUNDARY）に対して 73 バイト版で試す。
      // 上限が無ければ bcrypt.compare が true を返し 200 になってしまう経路。
      await http.post('/auth/login').send({ email, password: OVER }).expect(422);

      // 正しいパスワードでは従来どおりログインできる（上限追加で壊していない）
      await http.post('/auth/login').send({ email, password: BOUNDARY }).expect(200);
    });
  });

  // メールの上限は DB カラム（`users.email` = varchar(255)）と同値。API 側で弾かないと超過分が
  // INSERT まで到達し、MySQL がカラム長エラーを返して 500 になる。SQLite は varchar の長さを
  // 強制しないため、この e2e が見ているのは「API が INSERT 前に弾くこと」だけで、
  // DB 側が実際にその長さで拒否することは IT（MySQL コンテナ）が担保する。
  describe('メールの上限は 255 文字（DB カラムと同値）', () => {
    const DOMAIN = '@example.com'; // 12 文字
    const BOUNDARY = `${'a'.repeat(255 - DOMAIN.length)}${DOMAIN}`; // 255 文字ちょうど
    const OVER = `${'a'.repeat(256 - DOMAIN.length)}${DOMAIN}`; // 256 文字

    it('正常系: 255 文字ちょうどのメールで登録できる', async () => {
      const res = await http
        .post('/auth/register')
        .send({ email: BOUNDARY, password: 'password123', displayName: 'Boundary' })
        .expect(201);

      expect(res.body.user.email).toBe(BOUNDARY);
    });

    it('異常系: 256 文字のメールは INSERT 前に 422（errors に email）', async () => {
      const res = await http
        .post('/auth/register')
        .send({ email: OVER, password: 'password123', displayName: 'Over' })
        .expect(422);

      expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual(['email']);
    });

    // 登録だけ絞ってログインを開けておくと、上限の意味がある入口が片方だけになる
    it('異常系: ログインでも 256 文字のメールは 422', async () => {
      await http.post('/auth/login').send({ email: OVER, password: 'password123' }).expect(422);
    });
  });

  // 未知キーを弾いているのはルート単位の ZodValidationPipe（.strict()）。
  // テスト専用のグローバル ValidationPipe に頼っていないことをここで固定する。
  it('異常系: 未知キーは .strict() で 422（errors のフィールドはそのキー名）', async () => {
    const res = await http
      .post('/auth/register')
      .send({ ...credentials, email: 'unknown-key@example.com', role: 'admin' })
      .expect(422);

    expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual(['role']);
  });

  it('異常系: 短すぎるパスワードは 422（errors に password）', async () => {
    const res = await http
      .post('/auth/register')
      .send({ email: 'a@example.com', password: 'short', displayName: 'A' })
      .expect(422);

    expect(res.body.statusCode).toBe(422);
    expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual(['password']);
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

  it('準正常系: 同じリフレッシュトークンを同時に使っても、成功するのは 1 本だけ', async () => {
    const login = await http
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);
    const refreshToken = login.body.refreshToken as string;

    // 同一トークンで 2 本同時にリフレッシュする（複数タブ / 端末の競合を模す）
    const [first, second] = await Promise.all([
      http.post('/auth/refresh').send({ refreshToken }),
      http.post('/auth/refresh').send({ refreshToken }),
    ]);

    // 1 本のトークンから 2 組のトークンペアが生まれてはならない（ローテーションの前提が崩れる）
    const statuses = [first.status, second.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 401]);
  });

  it('異常系: 認証なしで保護ルートにアクセスすると 401', async () => {
    await http.get('/tasks').expect(401);
  });
  describe('廃止された DryRun エンドポイント', () => {
    it('異常系: POST /auth/register/validate は 404（廃止済み。検証は本登録 POST /auth/register が担う）', async () => {
      await http.post('/auth/register/validate').send(credentials).expect(404);
    });
  });
});

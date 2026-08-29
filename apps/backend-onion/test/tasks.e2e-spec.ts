import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { ApiError } from '@app/api-client';
import { cleanupTestUploadDir, createTestApp } from './test-app.factory';

/** 422 レスポンスから、エラーが紐づいたフィールド名を取り出す。 */
const errorFields = (body: ApiError): string[] => (body.errors ?? []).map((e) => e.field);

/**
 * タスク CRUD + 所有者認可 + 日付範囲の e2e テスト（実スタック / HTTP 経由）。
 */
describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  const START = '2026-06-10T00:00:00.000Z';
  const END = '2026-06-15T00:00:00.000Z';

  const register = async (email: string): Promise<string> => {
    const res = await http
      .post('/auth/register')
      .send({ email, password: 'password123', displayName: 'User' })
      .expect(201);
    return res.body.accessToken as string;
  };

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
    token = await register('owner@example.com');
  });

  afterAll(async () => {
    await app.close();
    cleanupTestUploadDir();
  });

  it('正常系: 作成→一覧→詳細→更新→削除の一連が成立する', async () => {
    // create
    const created = await http
      .post('/tasks')
      .set(auth(token))
      .send({ title: '牛乳を買う', description: '2本', startDate: START, endDate: END })
      .expect(201);
    const id = created.body.id as string;
    expect(created.body.status).toBe('todo');
    expect(created.body.startDate).toBe(START);
    expect(created.body.endDate).toBe(END);

    // list
    const list = await http.get('/tasks').set(auth(token)).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(id);

    // detail
    const detail = await http.get(`/tasks/${id}`).set(auth(token)).expect(200);
    expect(detail.body.title).toBe('牛乳を買う');

    // update
    const updated = await http
      .patch(`/tasks/${id}`)
      .set(auth(token))
      .send({ status: 'done' })
      .expect(200);
    expect(updated.body.status).toBe('done');
    expect(updated.body.title).toBe('牛乳を買う');

    // delete
    await http.delete(`/tasks/${id}`).set(auth(token)).expect(204);
    await http.get(`/tasks/${id}`).set(auth(token)).expect(404);
  });

  it('正常系: endDate は省略できる（開始のみ必須）', async () => {
    const created = await http
      .post('/tasks')
      .set(auth(token))
      .send({ title: '終わり未定', startDate: START })
      .expect(201);
    expect(created.body.startDate).toBe(START);
    expect(created.body.endDate).toBeUndefined();
  });

  it('異常系: startDate 無しはバリデーションで 422（errors に startDate）', async () => {
    const res = await http.post('/tasks').set(auth(token)).send({ title: '開始なし' }).expect(422);

    expect(res.body.statusCode).toBe(422);
    expect(errorFields(res.body)).toEqual(['startDate']);
  });

  it('異常系: 終了が開始より前は 422（業務ルール違反も errors に endDate で返る）', async () => {
    const res = await http
      .post('/tasks')
      .set(auth(token))
      .send({ title: '逆転', startDate: END, endDate: START })
      .expect(422);

    expect(errorFields(res.body)).toEqual(['endDate']);
    expect(res.body.errors[0].messages).toEqual(['endDate must be on or after startDate']);
  });

  // グローバル ValidationPipe（テスト専用）を外したため、未知キーを弾いているのは
  // ルート単位の ZodValidationPipe（.strict()）だけ。本番と同じ経路であることをここで固定する。
  it('異常系: 未知キーは .strict() で 422（errors のフィールドはそのキー名）', async () => {
    const res = await http
      .post('/tasks')
      .set(auth(token))
      .send({ title: '未知キー', startDate: START, isAdmin: true })
      .expect(422);

    expect(errorFields(res.body)).toEqual(['isAdmin']);
  });

  it('異常系: タイトル空はバリデーションで 422（errors に title）', async () => {
    const res = await http
      .post('/tasks')
      .set(auth(token))
      .send({ title: '', startDate: START })
      .expect(422);

    expect(errorFields(res.body)).toEqual(['title']);
  });

  it('準正常系: 他人のタスクは取得・更新できない（403）', async () => {
    const created = await http
      .post('/tasks')
      .set(auth(token))
      .send({ title: 'owner のタスク', startDate: START })
      .expect(201);
    const id = created.body.id as string;

    const otherToken = await register('other@example.com');

    await http.get(`/tasks/${id}`).set(auth(otherToken)).expect(403);
    await http.patch(`/tasks/${id}`).set(auth(otherToken)).send({ title: 'のっとり' }).expect(403);
  });

  it('異常系: トークンなしの作成は 401', async () => {
    await http.post('/tasks').send({ title: 'x', startDate: START }).expect(401);
  });

  describe('url フィールド（http/https のみ許可）', () => {
    it('正常系: https URL を付けて作成→詳細に反映される', async () => {
      const created = await http
        .post('/tasks')
        .set(auth(token))
        .send({ title: 'リンク付き', startDate: START, url: 'https://example.com/docs' })
        .expect(201);
      expect(created.body.url).toBe('https://example.com/docs');

      const id = created.body.id as string;
      const detail = await http.get(`/tasks/${id}`).set(auth(token)).expect(200);
      expect(detail.body.url).toBe('https://example.com/docs');
    });

    it('異常系: javascript: スキームはバリデーションで 422（errors に url）', async () => {
      const res = await http
        .post('/tasks')
        .set(auth(token))
        .send({ title: 'XSS試行', startDate: START, url: 'javascript:alert(1)' })
        .expect(422);

      expect(errorFields(res.body)).toEqual(['url']);
    });

    it('異常系: 2048 文字を超える URL は 422（errors に url）', async () => {
      const tooLong = `https://example.com/${'a'.repeat(2048)}`;
      const res = await http
        .post('/tasks')
        .set(auth(token))
        .send({ title: '長すぎURL', startDate: START, url: tooLong })
        .expect(422);

      expect(errorFields(res.body)).toEqual(['url']);
    });
  });

  describe('画像アップロード（POST/DELETE /tasks/:id/image）', () => {
    const PNG = Buffer.from('89504e470d0a1a0a', 'hex'); // PNG シグネチャ（中身はダミー）

    const createTask = async (): Promise<string> => {
      const res = await http
        .post('/tasks')
        .set(auth(token))
        .send({ title: '画像つきタスク', startDate: START })
        .expect(201);
      return res.body.id as string;
    };

    it('正常系: 画像を添付→公開URLで取得でき、削除すると 404 になる', async () => {
      const id = await createTask();

      // upload
      const uploaded = await http
        .post(`/tasks/${id}/image`)
        .set(auth(token))
        .attach('file', PNG, { filename: 'pic.png', contentType: 'image/png' })
        .expect(201);
      const imageUrl = uploaded.body.imageUrl as string;
      expect(imageUrl).toMatch(/^\/uploads\/.+\.png$/);

      // 静的配信で実体が取得できる
      await http.get(imageUrl).expect(200);

      // 詳細にも imageUrl が反映されている
      const detail = await http.get(`/tasks/${id}`).set(auth(token)).expect(200);
      expect(detail.body.imageUrl).toBe(imageUrl);

      // delete → imageUrl が消え、実体も 404 になる
      const removed = await http.delete(`/tasks/${id}/image`).set(auth(token)).expect(200);
      expect(removed.body.imageUrl).toBeUndefined();
      await http.get(imageUrl).expect(404);
    });

    it('異常系: 画像でない MIME は 422（errors に file）', async () => {
      const id = await createTask();
      const res = await http
        .post(`/tasks/${id}/image`)
        .set(auth(token))
        .attach('file', Buffer.from('plain text'), { filename: 'a.txt', contentType: 'text/plain' })
        .expect(422);

      expect(errorFields(res.body)).toEqual(['file']);
    });

    it('異常系: サイズ上限（2MB）超過は Multer が受信段階で弾き 413', async () => {
      const id = await createTask();
      const tooBig = Buffer.alloc(2 * 1024 * 1024 + 1, 1);
      const res = await http
        .post(`/tasks/${id}/image`)
        .set(auth(token))
        .attach('file', tooBig, { filename: 'big.png', contentType: 'image/png' })
        .expect(413);

      // 「内容が不正」ではなく「大きすぎて受け取れない」ので 422 ではない。
      // 保存にも到達しないことは、添付前の imageUrl が変わらないことで確かめる。
      expect(res.body.statusCode).toBe(413);
      const detail = await http.get(`/tasks/${id}`).set(auth(token)).expect(200);
      expect(detail.body.imageUrl).toBeUndefined();
    });

    it('異常系: ファイル無しは 422（errors に file）', async () => {
      const id = await createTask();
      const res = await http.post(`/tasks/${id}/image`).set(auth(token)).expect(422);

      expect(errorFields(res.body)).toEqual(['file']);
    });

    it('異常系: 存在しないタスクへの添付は 404', async () => {
      await http
        .post('/tasks/nonexistent-id/image')
        .set(auth(token))
        .attach('file', PNG, { filename: 'pic.png', contentType: 'image/png' })
        .expect(404);
    });

    it('準正常系: 他人のタスクへの添付は 403', async () => {
      const id = await createTask();
      const otherToken = await register('image-other@example.com');
      await http
        .post(`/tasks/${id}/image`)
        .set(auth(otherToken))
        .attach('file', PNG, { filename: 'pic.png', contentType: 'image/png' })
        .expect(403);
    });

    it('異常系: トークンなしの添付は 401', async () => {
      const id = await createTask();
      await http
        .post(`/tasks/${id}/image`)
        .attach('file', PNG, { filename: 'pic.png', contentType: 'image/png' })
        .expect(401);
    });
  });
  describe('廃止された DryRun エンドポイント', () => {
    it('異常系: POST /tasks/validate は 404（廃止済み。検証は本登録 POST /tasks が担う）', async () => {
      await http
        .post('/tasks/validate')
        .set(auth(token))
        .send({ title: 'x', startDate: START })
        .expect(404);
    });

    it('異常系: POST /tasks/:id/validate は 404（廃止済み。検証は PATCH /tasks/:id が担う）', async () => {
      await http.post('/tasks/some-id/validate').set(auth(token)).send({ title: 'x' }).expect(404);
    });
  });
});

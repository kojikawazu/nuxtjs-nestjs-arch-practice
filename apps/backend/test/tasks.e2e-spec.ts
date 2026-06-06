import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-app.factory';

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

  it('異常系: startDate 無しはバリデーションで 400', async () => {
    await http.post('/tasks').set(auth(token)).send({ title: '開始なし' }).expect(400);
  });

  it('異常系: 終了が開始より前は 400', async () => {
    await http
      .post('/tasks')
      .set(auth(token))
      .send({ title: '逆転', startDate: END, endDate: START })
      .expect(400);
  });

  it('異常系: タイトル空はバリデーションで 400', async () => {
    await http.post('/tasks').set(auth(token)).send({ title: '', startDate: START }).expect(400);
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

  describe('POST /tasks/validate（作成 DryRun・保存しない）', () => {
    it('正常系: 有効な入力は 200 { valid: true } を返し、一覧に追加されない', async () => {
      const before = await http.get('/tasks').set(auth(token)).expect(200);

      const res = await http
        .post('/tasks/validate')
        .set(auth(token))
        .send({ title: '検証だけのタスク', startDate: START, endDate: END })
        .expect(200);
      expect(res.body).toEqual({ valid: true });

      // DryRun なので件数は増えない
      const after = await http.get('/tasks').set(auth(token)).expect(200);
      expect(after.body).toHaveLength(before.body.length);
    });

    it('異常系: タイトル空はバリデーションで 400', async () => {
      await http
        .post('/tasks/validate')
        .set(auth(token))
        .send({ title: '', startDate: START })
        .expect(400);
    });

    it('異常系: 終了が開始より前は 400', async () => {
      await http
        .post('/tasks/validate')
        .set(auth(token))
        .send({ title: '逆転', startDate: END, endDate: START })
        .expect(400);
    });

    it('異常系: トークンなしは 401', async () => {
      await http.post('/tasks/validate').send({ title: 'x', startDate: START }).expect(401);
    });
  });

  describe('POST /tasks/:id/validate（更新 DryRun・保存しない）', () => {
    it('正常系: 自分のタスクは 200 を返し、内容は変更されない', async () => {
      const created = await http
        .post('/tasks')
        .set(auth(token))
        .send({ title: '元のタイトル', status: 'todo', startDate: START })
        .expect(201);
      const id = created.body.id as string;

      const res = await http
        .post(`/tasks/${id}/validate`)
        .set(auth(token))
        .send({ title: '変更案', status: 'done' })
        .expect(200);
      expect(res.body).toEqual({ valid: true });

      // DryRun なので保存されていない（元のまま）
      const detail = await http.get(`/tasks/${id}`).set(auth(token)).expect(200);
      expect(detail.body.title).toBe('元のタイトル');
      expect(detail.body.status).toBe('todo');
    });

    it('異常系: マージ後に終了が開始より前なら 400', async () => {
      const created = await http
        .post('/tasks')
        .set(auth(token))
        .send({ title: '期間タスク', startDate: END })
        .expect(201);
      const id = created.body.id as string;

      // 既存 startDate(END) より前の endDate(START) を指定すると逆転する
      await http
        .post(`/tasks/${id}/validate`)
        .set(auth(token))
        .send({ endDate: START })
        .expect(400);
    });

    it('異常系: 存在しないタスクは 404', async () => {
      await http
        .post('/tasks/nonexistent-id/validate')
        .set(auth(token))
        .send({ title: 'x' })
        .expect(404);
    });

    it('準正常系: 他人のタスクは 403', async () => {
      const created = await http
        .post('/tasks')
        .set(auth(token))
        .send({ title: 'owner のタスク', startDate: START })
        .expect(201);
      const id = created.body.id as string;

      const otherToken = await register('validate-other@example.com');

      await http
        .post(`/tasks/${id}/validate`)
        .set(auth(otherToken))
        .send({ title: 'のっとり' })
        .expect(403);
    });
  });
});

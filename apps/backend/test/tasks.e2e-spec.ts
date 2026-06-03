import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-app.factory';

/**
 * タスク CRUD + 所有者認可の e2e テスト（実スタック / HTTP 経由）。
 */
describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

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
      .send({ title: '牛乳を買う', description: '2本' })
      .expect(201);
    const id = created.body.id as string;
    expect(created.body.status).toBe('todo');

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

  it('異常系: タイトル空はバリデーションで 400', async () => {
    await http.post('/tasks').set(auth(token)).send({ title: '' }).expect(400);
  });

  it('準正常系: 他人のタスクは取得・更新できない（403）', async () => {
    const created = await http
      .post('/tasks')
      .set(auth(token))
      .send({ title: 'owner のタスク' })
      .expect(201);
    const id = created.body.id as string;

    const otherToken = await register('other@example.com');

    await http.get(`/tasks/${id}`).set(auth(otherToken)).expect(403);
    await http.patch(`/tasks/${id}`).set(auth(otherToken)).send({ title: 'のっとり' }).expect(403);
  });

  it('異常系: トークンなしの作成は 401', async () => {
    await http.post('/tasks').send({ title: 'x' }).expect(401);
  });
});

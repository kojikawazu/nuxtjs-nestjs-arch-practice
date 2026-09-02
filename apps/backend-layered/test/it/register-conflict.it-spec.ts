import 'reflect-metadata';
import { ConflictException, type INestApplication } from '@nestjs/common';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import request from 'supertest';
import { QueryFailedError } from 'typeorm';
import { UsersService } from '../../src/modules/users/users.service';
import { cleanupTestUploadDir, createTestApp } from '../test-app.factory';

/**
 * BE IT（統合テスト・**MySQL コンテナ必須**）: 登録の一意制約とメール長の忠実性。
 *
 * e2e（in-memory SQLite）では確かめられない問いだけをここに置く:
 * - SQLite は varchar の長さを強制しないため、API の上限 255 が**カラム長と一致しているか**を確認できない
 * - SQLite の既定照合順序は BINARY なので、ケース違いのメールが重複扱いになるかは MySQL でしか出ない
 * - better-sqlite3 は同期ドライバなので、並行登録が本当に競合する状況を作れない
 *
 * 実行（3 版共通・`make test-back-it` が mysql-test を healthy まで待って回す）:
 *   docker compose --profile test up -d --wait mysql-test
 *   pnpm --filter @app/backend-layered test:it
 */
const MYSQL_CONNECTION: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.IT_DB_HOST ?? '127.0.0.1',
  port: Number(process.env.IT_DB_PORT ?? 3307),
  username: process.env.IT_DB_USERNAME ?? 'taskuser',
  password: process.env.IT_DB_PASSWORD ?? 'taskpassword',
  database: process.env.IT_DB_DATABASE ?? 'taskdb_it',
};

const DOMAIN = '@example.com'; // 12 文字
const EMAIL_255 = `${'a'.repeat(255 - DOMAIN.length)}${DOMAIN}`;
const EMAIL_256 = `${'a'.repeat(256 - DOMAIN.length)}${DOMAIN}`;

describe('登録の一意制約・メール長 IT（MySQL コンテナ）', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let users: UsersService;

  beforeAll(async () => {
    // MySQL コンテナは起動直後まだ接続を受け付けないことがある（初回初期化中は接続を切る）。
    // `make test-back-it` は `--wait` で healthy を待つが、単体起動での取りこぼしに備えてリトライする。
    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        app = await createTestApp(MYSQL_CONNECTION);
        http = request(app.getHttpServer());
        users = app.get(UsersService);
        return;
      } catch (err) {
        if (attempt === maxAttempts) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    cleanupTestUploadDir();
  });

  describe('同一メールの重複登録', () => {
    // 外部契約の固定。ただし片方が完全に先行すると事前チェック側で 409 になるため、
    // このケース単独では「制約違反の経路を必ず通る」とは言えない（次のケースが本体の担保）。
    it('準正常系: 同一メールの並行登録は 201 が 1 件・409 が 1 件（500 にならない）', async () => {
      const body = { email: 'race@example.com', password: 'password123', displayName: 'Race' };

      const [first, second] = await Promise.all([
        http.post('/auth/register').send(body),
        http.post('/auth/register').send(body),
      ]);

      const statuses = [first.status, second.status].sort((a, b) => a - b);
      expect(statuses).toEqual([201, 409]);
    });

    // UsersService を直接呼ぶと AuthService.register の事前チェックを通らないため、
    // 並行登録で負けた側と同じ経路（DB の一意制約違反）を必ず通る。翻訳が無ければここで
    // QueryFailedError のまま抜け、HTTP では 500 になる。
    it('準正常系: 事前チェックを経ない重複 INSERT も ConflictException になる', async () => {
      const input = { email: 'dup@example.com', passwordHash: 'hashed', displayName: 'Dup' };
      await users.create(input);

      await expect(users.create(input)).rejects.toBeInstanceOf(ConflictException);
    });

    // SQLite の既定照合順序（BINARY）では別メール扱いになり 201 が返るため、e2e では出せない差分
    it('準正常系: ケース違いのメールも MySQL の照合順序で重複と見なされ 409', async () => {
      await http
        .post('/auth/register')
        .send({ email: 'case@example.com', password: 'password123', displayName: 'Case' })
        .expect(201);

      await http
        .post('/auth/register')
        .send({ email: 'Case@Example.com', password: 'password123', displayName: 'Case2' })
        .expect(409);
    });
  });

  describe('メール長は API 上限とカラム長が一致する', () => {
    it('正常系: 255 文字ちょうどのメールは MySQL に保存できる', async () => {
      const res = await http
        .post('/auth/register')
        .send({ email: EMAIL_255, password: 'password123', displayName: 'Boundary' })
        .expect(201);

      expect(res.body.user.email).toBe(EMAIL_255);
    });

    it('異常系: 256 文字のメールは INSERT 前に 422（カラム長エラーの 500 にしない）', async () => {
      const res = await http
        .post('/auth/register')
        .send({ email: EMAIL_256, password: 'password123', displayName: 'Over' })
        .expect(422);

      expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual(['email']);
    });

    // API の上限がカラム長より緩ければ、この INSERT が通ってしまい上の 422 は過剰制限になる。
    // 一意制約違反ではないので翻訳もされない＝他の DB エラーを握りつぶしていないことも同時に示す。
    it('異常系: DB は 256 文字のメールを拒否する（翻訳せず QueryFailedError のまま）', async () => {
      await expect(
        users.create({ email: EMAIL_256, passwordHash: 'hashed', displayName: 'Over' }),
      ).rejects.toBeInstanceOf(QueryFailedError);
    });
  });
});

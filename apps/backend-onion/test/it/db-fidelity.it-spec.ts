import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { UserOrmEntity } from '../../src/modules/users/infrastructure/entities/user.orm-entity';
import { RefreshTokenOrmEntity } from '../../src/modules/auth/infrastructure/entities/refresh-token.orm-entity';

/**
 * BE IT（統合テスト・**MySQL コンテナ必須**）: DB 忠実性の検証。
 *
 * 狙いは E2E（シナリオが通るか）とは別で「**DB が正しいか**」——
 * in-memory SQLite では踏めない MySQL 固有の挙動（照合順序・一意制約）を使い捨ての MySQL コンテナで確認する。
 * これが「IT を MySQL コンテナで回す意味」の代表例（同じ HTTP シナリオを 2 回書く重複を避け、問いを分ける）。
 *
 * 実行（3 版共通・`make test-back-it` が mysql-test を healthy まで待って回す）:
 *   docker compose --profile test up -d --wait mysql-test
 *   pnpm --filter @app/backend-onion test:it
 * 接続先は既定で compose の mysql-test（127.0.0.1:3307 / taskuser / taskdb_it）。IT_DB_* で上書き可。
 */
const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.IT_DB_HOST ?? '127.0.0.1',
  port: Number(process.env.IT_DB_PORT ?? 3307),
  username: process.env.IT_DB_USERNAME ?? 'taskuser',
  password: process.env.IT_DB_PASSWORD ?? 'taskpassword',
  database: process.env.IT_DB_DATABASE ?? 'taskdb_it',
  entities: [UserOrmEntity, RefreshTokenOrmEntity],
  synchronize: true,
  // この IT は taskdb_it を占有して毎回作り直す（E2E は taskdb_e2e＝同一 mysql-test コンテナを DB 名で二役）
  dropSchema: true,
});

describe('DB 忠実性 IT（MySQL コンテナ）', () => {
  beforeAll(async () => {
    // MySQL コンテナは起動直後まだ接続を受け付けないことがある（初回初期化中は接続を切る）。
    // `make test-back-it` は `--wait` で healthy を待つが、単体起動での取りこぼしに備えてリトライする。
    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await dataSource.initialize();
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
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('照合順序: MySQL は email を大文字小文字を区別せず一致させる（SQLite の既定 BINARY では不一致）', async () => {
    const repo = dataSource.getRepository(UserOrmEntity);
    await repo.save(
      repo.create({ email: 'Taro@Example.com', passwordHash: 'x', displayName: 'taro' }),
    );

    // MySQL の既定照合順序 utf8mb4_0900_ai_ci は ci＝case-insensitive。
    // → 別ケースのメールでも既存行にヒットする。SQLite の既定（BINARY 比較）なら null になり、この差は踏めない。
    const found = await repo.findOne({ where: { email: 'taro@example.com' } });

    expect(found).not.toBeNull();
    expect(found?.displayName).toBe('taro');
  });

  it('一意制約: ケース違いのメールも unique index で重複と見なされ拒否される', async () => {
    const repo = dataSource.getRepository(UserOrmEntity);
    await repo.save(
      repo.create({ email: 'Hanako@Example.com', passwordHash: 'x', displayName: 'hanako' }),
    );

    // ci 照合 + email の unique index により、'hanako@example.com' は重複キー違反になる。
    await expect(
      repo.save(
        repo.create({ email: 'hanako@example.com', passwordHash: 'y', displayName: 'dup' }),
      ),
    ).rejects.toThrow();
  });

  describe('リフレッシュトークンの並行消費（ローテーション）', () => {
    /** 消費対象の行を 1 件用意する（tokenHash は行を一意にするためだけの値）。 */
    const insertToken = async (): Promise<string> => {
      const repo = dataSource.getRepository(RefreshTokenOrmEntity);
      const row = await repo.save(
        repo.create({
          userId: 'user-1',
          tokenHash: `hash-${randomUUID()}`,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      );
      return row.id;
    };

    it('正常系: 単独の DELETE は影響行数 1 を返す（消費判定が成立する前提）', async () => {
      const id = await insertToken();

      const result = await dataSource.getRepository(RefreshTokenOrmEntity).delete({ id });

      // TypeORM が MySQL ドライバで affected を埋めることを実物で確認する
      expect(result.affected).toBe(1);
    });

    it('準正常系: 同一行への並行 DELETE で影響行数 1 を得るのは片方だけ', async () => {
      const id = await insertToken();
      // 別コネクションから同時に消しにいく。同一プロセスの await 順ではなく
      // **DB の行ロック**で直列化されることを確かめたいので、query runner を分ける。
      const a = dataSource.createQueryRunner();
      const b = dataSource.createQueryRunner();
      await Promise.all([a.connect(), b.connect()]);

      try {
        const [first, second] = await Promise.all([
          a.manager.delete(RefreshTokenOrmEntity, { id }),
          b.manager.delete(RefreshTokenOrmEntity, { id }),
        ]);

        // 合計が 2 になると、1 本のリフレッシュトークンから 2 組のトークンペアが発行されうる
        expect((first.affected ?? 0) + (second.affected ?? 0)).toBe(1);
      } finally {
        await Promise.all([a.release(), b.release()]);
      }
    });
  });
});

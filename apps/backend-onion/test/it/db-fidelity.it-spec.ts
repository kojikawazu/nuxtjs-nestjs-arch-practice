import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { UserOrmEntity } from '../../src/modules/users/infrastructure/user.orm-entity';

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
 * 接続先は既定で compose の mysql-test（127.0.0.1:3307 / taskuser / taskdb_test）。IT_DB_* で上書き可。
 */
const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.IT_DB_HOST ?? '127.0.0.1',
  port: Number(process.env.IT_DB_PORT ?? 3307),
  username: process.env.IT_DB_USERNAME ?? 'taskuser',
  password: process.env.IT_DB_PASSWORD ?? 'taskpassword',
  database: process.env.IT_DB_DATABASE ?? 'taskdb_test',
  entities: [UserOrmEntity],
  synchronize: true,
  // この IT は DB を占有して毎回作り直す（本格運用では E2E と DB 名を分け、同一コンテナを共有する）
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
});

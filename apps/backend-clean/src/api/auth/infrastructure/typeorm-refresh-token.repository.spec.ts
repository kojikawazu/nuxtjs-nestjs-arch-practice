import { createHash } from 'node:crypto';
import type { Repository } from 'typeorm';
import { RefreshTokenOrmEntity } from './refresh-token.orm-entity';
import { TypeOrmRefreshTokenRepository } from './typeorm-refresh-token.repository';

const sha256 = (token: string): string => createHash('sha256').update(token).digest('hex');

/**
 * TypeORM は外部 I/O なのでモックし、保管の核心（SHA-256 ハッシュ化・定数時間照合）を検証する。
 * リフレッシュトークンを bcrypt でハッシュすると 72 バイト切り捨てで衝突しうる過去バグの再発防止。
 */
describe('TypeOrmRefreshTokenRepository（ハッシュ保管・照合）', () => {
  let repo: { delete: jest.Mock; save: jest.Mock; create: jest.Mock; find: jest.Mock };
  let sut: TypeOrmRefreshTokenRepository;

  beforeEach(() => {
    repo = {
      delete: jest.fn(async () => undefined),
      save: jest.fn(async (x) => x),
      create: jest.fn((x) => x),
      find: jest.fn(),
    };
    sut = new TypeOrmRefreshTokenRepository(repo as unknown as Repository<RefreshTokenOrmEntity>);
  });

  it('正常系: save は生トークンではなく SHA-256 ハッシュを保存する', async () => {
    const expiresAt = new Date('2026-02-01T00:00:00.000Z');

    await sut.save('user-1', 'raw-refresh-token', expiresAt);

    const created = repo.create.mock.calls[0][0] as RefreshTokenOrmEntity;
    expect(created.tokenHash).toBe(sha256('raw-refresh-token'));
    expect(created.tokenHash).not.toBe('raw-refresh-token');
    expect(repo.save).toHaveBeenCalledTimes(1);
    // 期限切れの古い行掃除のため delete も呼ばれる
    expect(repo.delete).toHaveBeenCalled();
  });

  it('正常系: 保存ハッシュに一致する生トークンは {id,userId} を返す', async () => {
    repo.find.mockResolvedValue([
      {
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: sha256('raw-token'),
        expiresAt: new Date(),
        createdAt: new Date(),
      },
    ]);

    const match = await sut.findMatch('user-1', 'raw-token');

    expect(match).toEqual({ id: 'rt-1', userId: 'user-1' });
  });

  it('準正常系: 一致するハッシュが無ければ null（別トークンは照合不成立）', async () => {
    repo.find.mockResolvedValue([
      {
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: sha256('other-token'),
        expiresAt: new Date(),
        createdAt: new Date(),
      },
    ]);

    expect(await sut.findMatch('user-1', 'raw-token')).toBeNull();
  });
});

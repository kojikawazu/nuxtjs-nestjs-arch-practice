import { QueryFailedError, type Repository } from 'typeorm';
import { EmailAlreadyRegisteredError } from '../../domain/errors/user.errors';
import type { UserOrmEntity } from '../entities/user.orm-entity';
import { TypeOrmUserRepository } from './typeorm-user.repository';

/**
 * TypeORM は外部 I/O なのでモックし、create の「一意制約違反 → 業務エラー」の翻訳だけを検証する。
 *
 * この翻訳が無いと、並行登録で負けた側の QueryFailedError が例外フィルタの既定分岐へ落ち、
 * 仕様上 409 のはずが 500 になる。事前の findByEmail は check-then-act で競合を防げないため、
 * DB の一意制約を捕まえるこの経路が唯一の砦になる。
 */
const savedRow = (email: string): UserOrmEntity =>
  ({
    id: 'user-1',
    email,
    passwordHash: 'hashed',
    displayName: 'taro',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  }) as UserOrmEntity;

const duplicateEntryError = () =>
  new QueryFailedError(
    'INSERT INTO `users` ...',
    [],
    Object.assign(new Error("Duplicate entry 'taro@example.com'"), { code: 'ER_DUP_ENTRY' }),
  );

describe('TypeOrmUserRepository（create の一意制約違反の翻訳）', () => {
  let repo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let sut: TypeOrmUserRepository;
  const input = { email: 'taro@example.com', passwordHash: 'hashed', displayName: 'taro' };

  beforeEach(() => {
    repo = {
      create: jest.fn((x) => x),
      save: jest.fn(async () => savedRow(input.email)),
      findOne: jest.fn(),
    };
    sut = new TypeOrmUserRepository(repo as unknown as Repository<UserOrmEntity>);
  });

  it('正常系: 保存できたらドメイン User を返す', async () => {
    const user = await sut.create(input);

    expect(user.id).toBe('user-1');
    expect(user.email).toBe('taro@example.com');
    expect(user.passwordHash).toBe('hashed');
  });

  it('準正常系: 一意制約違反は EmailAlreadyRegisteredError（409）に翻訳する', async () => {
    repo.save.mockRejectedValue(duplicateEntryError());

    await expect(sut.create(input)).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });

  it('準正常系: 翻訳したエラーの kind は conflict（フィルタが 409 に写す分類）', async () => {
    repo.save.mockRejectedValue(duplicateEntryError());

    await expect(sut.create(input)).rejects.toMatchObject({
      kind: 'conflict',
      message: 'Email already registered',
    });
  });

  // 握りつぶすと、DB 障害が「メール重複」として利用者に見え、原因調査が迷子になる
  it('異常系: 一意制約違反以外の DB エラーはそのまま再送出する', async () => {
    const dbFailure = new QueryFailedError(
      'INSERT INTO `users` ...',
      [],
      Object.assign(new Error('Data too long for column'), { code: 'ER_DATA_TOO_LONG' }),
    );
    repo.save.mockRejectedValue(dbFailure);

    await expect(sut.create(input)).rejects.toBe(dbFailure);
  });

  it('異常系: DB 由来でない例外もそのまま再送出する', async () => {
    const failure = new Error('unexpected');
    repo.save.mockRejectedValue(failure);

    await expect(sut.create(input)).rejects.toBe(failure);
  });
});

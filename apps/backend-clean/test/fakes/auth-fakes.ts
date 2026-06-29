import type { PasswordHasher } from '../../src/api/auth/application/ports/password-hasher.port';
import type { RefreshTokenRepository } from '../../src/api/auth/application/ports/refresh-token-repository.port';
import type { TokenIssuer } from '../../src/api/auth/application/ports/token-issuer.port';
import type { UserRepository } from '../../src/api/users/application/ports/user-repository.port';
import { User, type UserState } from '../../src/api/users/domain/user';

/**
 * auth / users ユースケース単体テスト用の共有ヘルパー（クリーンアーキテクチャ版）。
 * 外部 I/O（DB=UserRepository/RefreshTokenRepository、暗号=PasswordHasher/TokenIssuer）を
 * すべて Port としてモックし、ユースケースの分岐（重複・認可・回転）だけを検証する。
 */

export const USER_ID = 'user-1';
export const EMAIL = 'taro@example.com';

/** 永続化済み相当のドメイン User を組み立てる。 */
export function buildUser(overrides: Partial<UserState> = {}): User {
  return User.fromState({
    id: USER_ID,
    email: EMAIL,
    passwordHash: 'stored-hash',
    displayName: 'taro',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  });
}

// --- UserRepository Port ---

export type UserRepoMock = {
  findByEmail: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
};

export function createUserRepoMock(): UserRepoMock {
  return { findByEmail: jest.fn(), findById: jest.fn(), create: jest.fn() };
}

export const asUserRepo = (m: UserRepoMock): UserRepository => m as unknown as UserRepository;

// --- PasswordHasher Port ---

export type PasswordHasherMock = { hash: jest.Mock; compare: jest.Mock };

export function createPasswordHasherMock(): PasswordHasherMock {
  return {
    hash: jest.fn(async () => 'hashed-password'),
    compare: jest.fn(async () => true),
  };
}

export const asHasher = (m: PasswordHasherMock): PasswordHasher => m as unknown as PasswordHasher;

// --- TokenIssuer Port ---

export type TokenIssuerMock = {
  issueAccessToken: jest.Mock;
  issueRefreshToken: jest.Mock;
  verifyRefreshToken: jest.Mock;
};

export const REFRESH_EXPIRES_AT = new Date('2026-02-01T00:00:00.000Z');

export function createTokenIssuerMock(): TokenIssuerMock {
  return {
    issueAccessToken: jest.fn(async () => 'access-token'),
    issueRefreshToken: jest.fn(async () => ({
      token: 'refresh-token',
      expiresAt: REFRESH_EXPIRES_AT,
    })),
    verifyRefreshToken: jest.fn(async () => ({ userId: USER_ID })),
  };
}

export const asTokenIssuer = (m: TokenIssuerMock): TokenIssuer => m as unknown as TokenIssuer;

// --- RefreshTokenRepository Port ---

export type RefreshRepoMock = {
  save: jest.Mock;
  findMatch: jest.Mock;
  deleteById: jest.Mock;
  deleteAllForUser: jest.Mock;
};

export function createRefreshRepoMock(): RefreshRepoMock {
  return {
    save: jest.fn(async () => undefined),
    findMatch: jest.fn(),
    deleteById: jest.fn(async () => undefined),
    deleteAllForUser: jest.fn(async () => undefined),
  };
}

export const asRefreshRepo = (m: RefreshRepoMock): RefreshTokenRepository =>
  m as unknown as RefreshTokenRepository;

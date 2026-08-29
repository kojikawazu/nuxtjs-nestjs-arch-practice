import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';

/**
 * AuthService の単体テスト。
 * 外部 I/O（UsersService の DB アクセス・RefreshToken リポジトリ）はモックするが、
 * bcrypt と JwtService は「純粋な計算」なので本物を使い、ロジックを実際に検証する。
 */
describe('AuthService', () => {
  const SECRETS: Record<string, string> = {
    'jwt.accessSecret': 'access-secret',
    'jwt.accessExpiresIn': '900s',
    'jwt.refreshSecret': 'refresh-secret',
    'jwt.refreshExpiresIn': '7d',
  };

  let users: { findByEmail: jest.Mock; findById: jest.Mock; create: jest.Mock };
  let refreshRepo: { find: jest.Mock; delete: jest.Mock; create: jest.Mock; save: jest.Mock };
  let jwt: JwtService;
  let service: AuthService;

  const buildUser = async (overrides: Partial<UserEntity> = {}): Promise<UserEntity> => ({
    id: 'user-1',
    email: 'taro@example.com',
    passwordHash: await bcrypt.hash('password123', 4),
    displayName: 'taro',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(() => {
    users = { findByEmail: jest.fn(), findById: jest.fn(), create: jest.fn() };
    refreshRepo = {
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };
    jwt = new JwtService({});
    const config = {
      getOrThrow: (key: string) => SECRETS[key],
    } as unknown as ConfigService;

    service = new AuthService(
      users as unknown as UsersService,
      jwt,
      config,
      refreshRepo as unknown as Repository<RefreshTokenEntity>,
    );
  });

  describe('register', () => {
    it('正常系: 新規ユーザーを作成し、パスワードはハッシュ化して渡す', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockImplementation(async (input) =>
        buildUser({ id: 'created', email: input.email, displayName: input.displayName }),
      );

      const tokens = await service.register({
        email: 'taro@example.com',
        password: 'password123',
        displayName: 'taro',
      });

      // 平文パスワードがそのまま保存されないこと
      const createArg = users.create.mock.calls[0][0];
      expect(createArg.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', createArg.passwordHash)).toBe(true);

      // 発行された access token が正しい sub/email を持つこと
      const payload = await jwt.verifyAsync<{ sub: string; email: string }>(tokens.accessToken, {
        secret: SECRETS['jwt.accessSecret'],
      });
      expect(payload.sub).toBe('created');
      expect(payload.email).toBe('taro@example.com');
      expect(tokens.user.email).toBe('taro@example.com');

      // リフレッシュトークンはハッシュ化されて保存される
      expect(refreshRepo.save).toHaveBeenCalledTimes(1);
      const savedRefresh = refreshRepo.save.mock.calls[0][0] as RefreshTokenEntity;
      expect(savedRefresh.tokenHash).not.toBe(tokens.refreshToken);
    });

    it('準正常系: 既に登録済みのメールは ConflictException', async () => {
      users.findByEmail.mockResolvedValue(await buildUser());

      await expect(
        service.register({
          email: 'taro@example.com',
          password: 'password123',
          displayName: 'taro',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('正常系: 正しいパスワードでトークンを発行する', async () => {
      users.findByEmail.mockResolvedValue(await buildUser());

      const tokens = await service.login({ email: 'taro@example.com', password: 'password123' });

      const payload = await jwt.verifyAsync<{ sub: string }>(tokens.accessToken, {
        secret: SECRETS['jwt.accessSecret'],
      });
      expect(payload.sub).toBe('user-1');
    });

    it('異常系: パスワード不一致は UnauthorizedException', async () => {
      users.findByEmail.mockResolvedValue(await buildUser());

      await expect(
        service.login({ email: 'taro@example.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('準正常系: 未登録メールも（存在を漏らさず）UnauthorizedException', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const issueRefreshToken = (sub: string) =>
      jwt.signAsync({ sub }, { secret: SECRETS['jwt.refreshSecret'], expiresIn: '7d' });

    it('正常系: 有効なリフレッシュトークンで回転（旧トークン削除→新規発行）する', async () => {
      const user = await buildUser();
      const refreshToken = await issueRefreshToken(user.id);
      const row: RefreshTokenEntity = {
        id: 'rt-1',
        userId: user.id,
        // 保存形式（SHA-256 hex）を再現
        tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        createdAt: new Date(),
      };
      refreshRepo.find.mockResolvedValue([row]);
      users.findById.mockResolvedValue(user);

      const tokens = await service.refresh(refreshToken);

      // 旧トークン行が削除（ローテーション）される
      expect(refreshRepo.delete).toHaveBeenCalledWith({ id: 'rt-1' });
      const payload = await jwt.verifyAsync<{ sub: string }>(tokens.accessToken, {
        secret: SECRETS['jwt.accessSecret'],
      });
      expect(payload.sub).toBe(user.id);
    });

    it('異常系: 署名不正なトークンは UnauthorizedException', async () => {
      await expect(service.refresh('not-a-valid-jwt')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(refreshRepo.find).not.toHaveBeenCalled();
    });

    it('準正常系: 署名は正しいが DB に該当ハッシュが無ければ UnauthorizedException', async () => {
      const refreshToken = await issueRefreshToken('user-1');
      refreshRepo.find.mockResolvedValue([]); // 保存済みトークンなし

      await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(users.findById).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('正常系: ユーザーのリフレッシュトークンをすべて失効させる', async () => {
      await service.logout('user-1');

      expect(refreshRepo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
    });
  });
});

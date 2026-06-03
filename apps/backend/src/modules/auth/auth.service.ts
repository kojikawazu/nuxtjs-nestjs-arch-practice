import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type JwtSignOptions, JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { LessThan, Repository } from 'typeorm';
import type { AuthTokens } from '@app/api-client';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import type { RefreshTokenPayload } from './auth.types';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

const PASSWORD_SALT_ROUNDS = 12;

/**
 * 認証のビジネスロジック（application 層）。
 * DB I/O は UsersService / RefreshToken リポジトリに委譲し、本サービス自体は純粋なロジックを持つ。
 * → 単体テストではそれらをモックし、ロジック（重複検出・パスワード照合・トークン回転）を検証する。
 */
@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    config: ConfigService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokens: Repository<RefreshTokenEntity>,
  ) {
    this.accessSecret = config.getOrThrow<string>('jwt.accessSecret');
    this.accessExpiresIn = config.getOrThrow<string>('jwt.accessExpiresIn');
    this.refreshSecret = config.getOrThrow<string>('jwt.refreshSecret');
    this.refreshExpiresIn = config.getOrThrow<string>('jwt.refreshExpiresIn');
  }

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
    });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      // ユーザー有無を漏らさないため、存在しない場合も同じ例外にする
      throw new UnauthorizedException('Invalid credentials');
    }
    const matched = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matched) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.refreshTokens.find({ where: { userId: payload.sub } });
    const matched = this.findMatchingToken(refreshToken, stored);
    if (!matched) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // ローテーション: 使用済みトークン行を削除してから新規発行する
    await this.refreshTokens.delete({ id: matched.id });
    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokens.delete({ userId });
  }

  private async issueTokens(user: UserEntity): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret: this.accessSecret, expiresIn: this.accessExpiresIn } as JwtSignOptions,
    );
    const refreshToken = await this.jwt.signAsync(
      // jti を付与し、同一秒・同一 payload でもトークンが必ず一意になるようにする（ローテーションの前提）
      { sub: user.id, jti: randomUUID() },
      { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn } as JwtSignOptions,
    );
    await this.persistRefreshToken(user.id, refreshToken);
    return {
      accessToken,
      refreshToken,
      user: UsersService.toPublicUser(user),
    };
  }

  private async persistRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = AuthService.hashRefreshToken(refreshToken);
    const decoded = this.jwt.decode<{ exp?: number } | null>(refreshToken);
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    // 期限切れの古い行を掃除しつつ新規行を保存
    await this.refreshTokens.delete({ userId, expiresAt: LessThan(new Date()) });
    const entity = this.refreshTokens.create({ userId, tokenHash, expiresAt });
    await this.refreshTokens.save(entity);
  }

  private findMatchingToken(
    refreshToken: string,
    stored: RefreshTokenEntity[],
  ): RefreshTokenEntity | null {
    const incoming = Buffer.from(AuthService.hashRefreshToken(refreshToken));
    for (const row of stored) {
      const candidate = Buffer.from(row.tokenHash);
      if (candidate.length === incoming.length && timingSafeEqual(candidate, incoming)) {
        return row;
      }
    }
    return null;
  }

  /**
   * リフレッシュトークン（JWT）は高エントロピーかつ 72 バイトを超えるため、
   * bcrypt（72 バイトで切り捨て）ではなく SHA-256 でトークン全体をハッシュする。
   */
  private static hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }
}

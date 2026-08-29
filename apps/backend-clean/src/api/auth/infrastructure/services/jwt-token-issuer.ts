import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type JwtSignOptions, JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { IssuedRefreshToken, TokenIssuer } from '../../application/ports/token-issuer.port';
import type { AccessTokenPayload, RefreshTokenPayload } from '../../auth.types';

/** decode で exp が取れなかった場合のリフレッシュ有効期限フォールバック（7 日）。 */
const REFRESH_FALLBACK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * TokenIssuer Port の JWT 実装（infrastructure 層）。
 * secret / expiresIn / jti 付与 / exp 抽出といった JWT 固有の事情をここに閉じ込める。
 */
@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow<string>('jwt.accessSecret');
    this.accessExpiresIn = config.getOrThrow<string>('jwt.accessExpiresIn');
    this.refreshSecret = config.getOrThrow<string>('jwt.refreshSecret');
    this.refreshExpiresIn = config.getOrThrow<string>('jwt.refreshExpiresIn');
  }

  issueAccessToken(user: { id: string; email: string }): Promise<string> {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email };
    return this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn,
    } as JwtSignOptions);
  }

  async issueRefreshToken(userId: string): Promise<IssuedRefreshToken> {
    // jti を付与し、同一秒・同一 payload でもトークンが必ず一意になるようにする（ローテーションの前提）
    const payload: RefreshTokenPayload = { sub: userId, jti: randomUUID() };
    const token = await this.jwt.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresIn,
    } as JwtSignOptions);
    const decoded = this.jwt.decode<{ exp?: number } | null>(token);
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + REFRESH_FALLBACK_MS);
    return { token, expiresAt };
  }

  async verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshSecret,
      });
      return { userId: payload.sub };
    } catch {
      return null;
    }
  }
}

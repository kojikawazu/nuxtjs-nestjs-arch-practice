import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenIssuer } from './jwt-token-issuer';

/**
 * JWT は「純粋な計算」なので本物の JwtService を使い、署名・検証・有効期限抽出を実際に検証する。
 * secret/expiresIn の供給だけ ConfigService スタブで与える（外部 I/O はない）。
 */
describe('JwtTokenIssuer（実 JWT）', () => {
  const SECRETS: Record<string, string> = {
    'jwt.accessSecret': 'access-secret',
    'jwt.accessExpiresIn': '900s',
    'jwt.refreshSecret': 'refresh-secret',
    'jwt.refreshExpiresIn': '7d',
  };

  let jwt: JwtService;
  let issuer: JwtTokenIssuer;

  beforeEach(() => {
    jwt = new JwtService({});
    const config = { getOrThrow: (key: string) => SECRETS[key] } as unknown as ConfigService;
    issuer = new JwtTokenIssuer(jwt, config);
  });

  it('正常系: アクセストークンは access secret で検証でき sub/email を持つ', async () => {
    const token = await issuer.issueAccessToken({ id: 'user-1', email: 'taro@example.com' });

    const payload = await jwt.verifyAsync<{ sub: string; email: string }>(token, {
      secret: SECRETS['jwt.accessSecret'],
    });
    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('taro@example.com');
  });

  it('正常系: リフレッシュトークンは未来の有効期限を持ち、verify で userId を復元できる', async () => {
    const issued = await issuer.issueRefreshToken('user-1');

    expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(await issuer.verifyRefreshToken(issued.token)).toEqual({ userId: 'user-1' });
  });

  it('異常系: 不正な文字列の検証は null を返す', async () => {
    expect(await issuer.verifyRefreshToken('not-a-jwt')).toBeNull();
  });

  it('準正常系: アクセストークンを refresh として検証すると（secret 違いで）null', async () => {
    const access = await issuer.issueAccessToken({ id: 'user-1', email: 'taro@example.com' });

    expect(await issuer.verifyRefreshToken(access)).toBeNull();
  });
});

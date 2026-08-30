import { configuration } from './configuration';

/**
 * configuration() の起動時検証テスト。
 * JWT 秘密鍵はフォールバックを持たないため、「設定が不正なら起動できない」ことをここで固定する
 * （アプリ起動は ConfigModule.forRoot({ load: [configuration] }) がこの関数を呼ぶ経路）。
 */
const VALID_ACCESS = 'unit-access-secret-0123456789abcdef';
const VALID_REFRESH = 'unit-refresh-secret-0123456789abcdef';

describe('configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.JWT_ACCESS_SECRET = VALID_ACCESS;
    process.env.JWT_REFRESH_SECRET = VALID_REFRESH;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('正常系: 有効な秘密鍵なら設定を返す', () => {
    const config = configuration();

    expect(config.jwt.accessSecret).toBe(VALID_ACCESS);
    expect(config.jwt.refreshSecret).toBe(VALID_REFRESH);
    expect(config.jwt.accessExpiresIn).toBe('900s');
    expect(config.jwt.refreshExpiresIn).toBe('7d');
  });

  it('準正常系: JWT_ACCESS_SECRET が未設定なら起動できない', () => {
    delete process.env.JWT_ACCESS_SECRET;

    expect(() => configuration()).toThrow(/JWT_ACCESS_SECRET is required/);
  });

  it('準正常系: JWT_REFRESH_SECRET が空文字なら起動できない', () => {
    process.env.JWT_REFRESH_SECRET = '';

    expect(() => configuration()).toThrow(/JWT_REFRESH_SECRET is required/);
  });

  // リポジトリに書かれている＝誰でも読める鍵。これで起動できるとトークンを偽造されうる
  it.each(['dev-access-secret', 'change-me-access-secret'])(
    '準正常系: 公開されたサンプル値 "%s" では起動できない',
    (sample) => {
      process.env.JWT_ACCESS_SECRET = sample;

      expect(() => configuration()).toThrow(/must not be a sample value/);
    },
  );

  it('準正常系: 32 文字未満の秘密鍵では起動できない', () => {
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(31);

    expect(() => configuration()).toThrow(/at least 32 characters \(got 31\)/);
  });

  it('異常系: access と refresh が同じ秘密鍵なら起動できない', () => {
    process.env.JWT_REFRESH_SECRET = VALID_ACCESS;

    // 同一鍵だと refresh トークンが access トークンとして検証を通ってしまう
    expect(() => configuration()).toThrow(/must differ/);
  });
});

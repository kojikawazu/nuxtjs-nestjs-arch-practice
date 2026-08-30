/**
 * 環境変数を型付きの設定オブジェクトに変換する。
 * ConfigModule.forRoot({ load: [configuration] }) で読み込む。
 */
export type DbType = 'mysql' | 'better-sqlite3';

export interface AppConfig {
  port: number;
  db: {
    type: DbType;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean;
  };
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  upload: {
    /** 画像の保存先ディレクトリ（本番は volume マウント、テストは tmpdir 等を指定） */
    dir: string;
    /** 1ファイルあたりの最大バイト数 */
    maxBytes: number;
    /** 許可する MIME タイプ */
    allowedMimeTypes: string[];
  };
}

/**
 * このリポジトリに書かれている既知のサンプル値。
 * 公開されている値で起動できると、誰でも同じ鍵でトークンを偽造できる。
 *
 * 載せるのは「**何も考えずに手順どおり進めると辿り着いてしまう値**」に限る
 * （かつての既定フォールバックと `.env.example` の値）。テスト / E2E 用の秘密鍵も
 * リポジトリ上は公開値だが、`.env` へ写す動線が無く、載せるとテスト側に
 * 検証の抜け道（NODE_ENV での迂回など）を作ることになるため対象外とする。
 */
const PUBLISHED_SAMPLE_SECRETS = new Set([
  'dev-access-secret',
  'dev-refresh-secret',
  'change-me-access-secret',
  'change-me-refresh-secret',
]);

/** HS256 の出力は 32 バイト。鍵がそれより短いと、鍵空間そのものが探索の的になる。 */
const MIN_JWT_SECRET_LENGTH = 32;

/**
 * JWT 秘密鍵を 1 本検証する。既定値へのフォールバックは置かない。
 * 値があれば起動してしまうと、本番で環境変数を渡し忘れても正常に見え、
 * 「公開された鍵で動いている」ことに誰も気づけないため、起動時に落とす。
 * @param name - 環境変数名（エラーメッセージに出す）
 * @param value - 環境変数の値
 * @returns 検証を通った秘密鍵
 */
function requireJwtSecret(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is required. Generate one with \`openssl rand -hex 32\` and set it as an environment variable.`,
    );
  }
  if (PUBLISHED_SAMPLE_SECRETS.has(value)) {
    throw new Error(
      `${name} must not be a sample value published in this repository. Generate your own with \`openssl rand -hex 32\`.`,
    );
  }
  if (value.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `${name} must be at least ${MIN_JWT_SECRET_LENGTH} characters (got ${value.length}).`,
    );
  }
  return value;
}

/**
 * access / refresh の秘密鍵を検証して返す。
 * 2 本が同じ値だと**リフレッシュトークンがアクセストークンとして検証を通る**ため、一致も拒否する
 * （`JwtAccessStrategy` は access secret での署名検証だけで、トークン種別のクレームを見ていない。
 * 同一鍵なら 7 日有効の refresh トークンが 15 分のアクセス権限として使えてしまう）。
 * @param env - process.env（テストから差し替えられるよう引数で受ける）
 * @returns 検証済みの accessSecret / refreshSecret
 */
function resolveJwtSecrets(env: NodeJS.ProcessEnv): {
  accessSecret: string;
  refreshSecret: string;
} {
  const accessSecret = requireJwtSecret('JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET);
  const refreshSecret = requireJwtSecret('JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET);
  if (accessSecret === refreshSecret) {
    throw new Error(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ. Sharing one secret lets a refresh token pass as an access token.',
    );
  }
  return { accessSecret, refreshSecret };
}

export function configuration(): AppConfig {
  const env = process.env;
  return {
    port: Number(env.BACKEND_PORT ?? 3001),
    db: {
      // mysql（本番/compose）/ better-sqlite3（ローカル・E2E で Docker 不要）を切替可能
      type: (env.DB_TYPE as DbType) ?? 'mysql',
      host: env.DB_HOST ?? 'localhost',
      port: Number(env.DB_PORT ?? 3306),
      username: env.DB_USERNAME ?? 'taskuser',
      password: env.DB_PASSWORD ?? 'taskpassword',
      database: env.DB_DATABASE ?? 'taskdb',
      // 学習用途: 開発では synchronize で素早く回す。本番では false + マイグレーション。
      synchronize: env.DB_SYNCHRONIZE === 'true',
    },
    jwt: {
      ...resolveJwtSecrets(env),
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN ?? '900s',
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
    upload: {
      // 既定はリポジトリ相対の uploads。compose では volume をこのパスへマウントする。
      dir: env.UPLOAD_DIR ?? 'uploads',
      maxBytes: Number(env.MAX_UPLOAD_BYTES ?? 2 * 1024 * 1024), // 既定 2MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    },
  };
}

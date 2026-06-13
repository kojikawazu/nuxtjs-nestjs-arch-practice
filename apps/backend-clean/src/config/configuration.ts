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
      accessSecret: env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN ?? '900s',
      refreshSecret: env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
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

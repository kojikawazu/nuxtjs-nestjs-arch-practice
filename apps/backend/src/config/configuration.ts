/**
 * 環境変数を型付きの設定オブジェクトに変換する。
 * ConfigModule.forRoot({ load: [configuration] }) で読み込む。
 */
export interface AppConfig {
  port: number;
  db: {
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
}

export function configuration(): AppConfig {
  const env = process.env;
  return {
    port: Number(env.BACKEND_PORT ?? 3001),
    db: {
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
  };
}

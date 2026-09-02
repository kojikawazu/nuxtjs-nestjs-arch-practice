import { QueryFailedError } from 'typeorm';
import { isUniqueViolationError } from './unique-violation';

/**
 * ドライバのエラーコード判定は「取りこぼす」と 500 が残り、「拾いすぎる」と
 * 無関係な DB 障害が 409 に化ける。どちらも本番でしか気づけないため、両方向を固定する。
 */
const queryFailed = (driverError: Error) =>
  new QueryFailedError('INSERT INTO `users` ...', [], driverError);

const driverErrorWithCode = (code: string) => Object.assign(new Error(code), { code });

describe('isUniqueViolationError（一意制約違反の判定）', () => {
  it('正常系: MySQL(mysql2) の ER_DUP_ENTRY は一意制約違反', () => {
    expect(isUniqueViolationError(queryFailed(driverErrorWithCode('ER_DUP_ENTRY')))).toBe(true);
  });

  it('正常系: SQLite(better-sqlite3) の SQLITE_CONSTRAINT_UNIQUE は一意制約違反', () => {
    expect(
      isUniqueViolationError(queryFailed(driverErrorWithCode('SQLITE_CONSTRAINT_UNIQUE'))),
    ).toBe(true);
  });

  // 「他の DB エラーを誤って握りつぶさない」ことの担保。総称コードや errno 範囲で
  // まとめて拾う実装にすると、ここが true になって 409 へ化ける
  it.each([
    ['NOT NULL 違反(SQLite)', 'SQLITE_CONSTRAINT_NOTNULL'],
    ['制約違反の総称(SQLite)', 'SQLITE_CONSTRAINT'],
    ['外部キー違反(MySQL)', 'ER_NO_REFERENCED_ROW_2'],
    ['カラム長超過(MySQL)', 'ER_DATA_TOO_LONG'],
    ['接続断(MySQL)', 'PROTOCOL_CONNECTION_LOST'],
  ])('準正常系: %s は一意制約違反ではない', (_name, code) => {
    expect(isUniqueViolationError(queryFailed(driverErrorWithCode(code)))).toBe(false);
  });

  it('準正常系: code を持たないドライバエラーは一意制約違反ではない', () => {
    expect(isUniqueViolationError(queryFailed(new Error('unknown driver failure')))).toBe(false);
  });

  it('準正常系: QueryFailedError でない例外は一意制約違反ではない', () => {
    expect(isUniqueViolationError(driverErrorWithCode('ER_DUP_ENTRY'))).toBe(false);
  });

  it('異常系: null / undefined を渡しても例外にせず false を返す', () => {
    expect(isUniqueViolationError(null)).toBe(false);
    expect(isUniqueViolationError(undefined)).toBe(false);
  });

  // driverError 側に code が無くても、QueryFailedError 自身にコピーされていれば拾う
  // （TypeORM は driverError のプロパティを例外自身へ Object.assign する）
  it('正常系: 例外自身にだけ code がある場合も判定できる', () => {
    const error = Object.assign(queryFailed(new Error('duplicate')), { code: 'ER_DUP_ENTRY' });

    expect(isUniqueViolationError(error)).toBe(true);
  });
});

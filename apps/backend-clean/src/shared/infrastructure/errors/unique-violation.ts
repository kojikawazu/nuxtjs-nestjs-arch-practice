import { QueryFailedError } from 'typeorm';

/**
 * ドライバが「一意制約違反」に対して返すエラーコード。
 * 本番の MySQL（mysql2）は `ER_DUP_ENTRY`、テストの SQLite（better-sqlite3）は
 * `SQLITE_CONSTRAINT_UNIQUE` を返す。**この 2 つだけ**を列挙するのが要点で、
 * `SQLITE_CONSTRAINT`（総称）や errno の範囲でまとめて拾うと NOT NULL 違反や
 * 外部キー違反まで同じ業務エラーへ化けてしまう（＝他の DB エラーを握りつぶす）。
 */
const UNIQUE_VIOLATION_CODES: readonly string[] = ['ER_DUP_ENTRY', 'SQLITE_CONSTRAINT_UNIQUE'];

/** オブジェクトから文字列の `code` を取り出す（ドライバのエラーは型付けされていないため）。 */
function readDriverCode(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const code = (value as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * TypeORM の例外が一意制約違反かどうかを判定する（infrastructure 層の関心）。
 *
 * 「事前に存在確認してから INSERT する」形は check-then-act なので、確認と INSERT の間に
 * 他の要求が同じ行を作れてしまう。原子性を持つのは DB の一意制約だけなので、
 * 制約違反を捕まえて業務エラーへ翻訳する経路が要る。ドライバ固有のコードは
 * Port の内側（application / domain）へ漏らさず、ここで吸収する。
 *
 * @param error - catch した例外（型は不明なので unknown で受ける）
 * @returns 一意制約違反なら true。それ以外の DB エラー・非 DB エラーは false（呼び出し元が再送出する）
 */
export function isUniqueViolationError(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  // QueryFailedError はドライバのプロパティを自身にもコピーするが、正は driverError 側
  const code = readDriverCode(error.driverError) ?? readDriverCode(error);
  return code !== undefined && UNIQUE_VIOLATION_CODES.includes(code);
}

/**
 * DTO スキーマで共有する zod ヘルパー。
 */

/** RFC 3339 の `full-date`（`2026-06-15`）。 */
const RFC_3339_FULL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * RFC 3339 の `date-time`（`2026-06-15T00:00:00.000Z` / `2026-06-15T09:00:00+09:00`）。
 * 区切りは `T` のみ・秒は必須・**オフセット（`Z` か `±HH:MM`）も必須**にしている。
 */
const RFC_3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/;

/**
 * 年月日がカレンダー上に実在するなら true。
 *
 * `Date.UTC` は存在しない日を翌月へ**繰り上げる**（`2026-02-30` → 3/2、平年の `2026-02-29` → 3/1）。
 * 正規表現では日と「その月の長さ」の関係を表せないため、組み立てた値を読み戻して
 * 入力と一致するかで繰り上がりを検出する。うるう年もこの往復だけで正しく扱える。
 *
 * 4 桁年 0000〜0099 は `Date.UTC` が 1900 年代へ写すため往復が一致せず false になるが、
 * 業務上そのような日付は現れないため許容する。
 */
function isRealCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * 値が本 API の受理する日付表現なら true。受理するのは RFC 3339 の 2 形式だけ:
 * `full-date`（`2026-06-15`。UTC 0 時として解釈される）と、
 * **オフセット必須**の `date-time`（`2026-06-15T00:00:00.000Z` / `2026-06-15T09:00:00+09:00`）。
 *
 * 以前は正規表現 + `Date.parse` で、次の 2 つを取りこぼしていた:
 * - **実在しない日**（`2026-02-30` / `2026-04-31` / 平年の `2026-02-29`）。`Date.parse` は
 *   月の長さを検査せず翌月へ繰り上げるため、利用者の指定とは別の日が保存されていた。
 * - **オフセットなしの日時**（`2026-01-01T12:30:00`、区切りが空白の `2026-01-01 12:30`）。
 *   `new Date()` が実行環境のローカル時刻として解釈するため、**同じリクエストがホストの
 *   タイムゾーン次第で別の instant になる**（開発機 Asia/Tokyo とコンテナ UTC で 9 時間ずれる）。
 *
 * ここを通った文字列は `new Date()` で一意な instant に落ちる（曖昧な形式が残らない）ため、
 * 内側の層は日付の解釈揺れを気にしなくてよい。
 */
export function isRfc3339(value: string): boolean {
  const fullDate = RFC_3339_FULL_DATE.exec(value);
  if (fullDate) {
    return isRealCalendarDate(Number(fullDate[1]), Number(fullDate[2]), Number(fullDate[3]));
  }

  const dateTime = RFC_3339_DATE_TIME.exec(value);
  if (!dateTime) return false;

  const [, year, month, day, hour, minute, second, offsetHour, offsetMinute] = dateTime;
  if (!isRealCalendarDate(Number(year), Number(month), Number(day))) return false;
  // 秒に 60（うるう秒）は受け付けない。JS の Date が表現できず、保存時に別の instant へ倒れるため
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return false;
  // `Z` の場合 offsetHour / offsetMinute は undefined（オフセット指定は数値の場合のみ検査する）
  if (offsetHour !== undefined && (Number(offsetHour) > 23 || Number(offsetMinute) > 59)) {
    return false;
  }
  return true;
}

const SAFE_PROTOCOLS = ['http:', 'https:'];

/**
 * 値が http/https の URL として解釈できれば true（旧 `@IsUrl({ protocols: ['http','https'] })` 相当）。
 * `javascript:` / `data:` 等の危険スキームは false（→ 422）。
 */
export function isHttpUrl(value: string): boolean {
  try {
    return SAFE_PROTOCOLS.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/**
 * メールアドレスの最大文字数。DB カラム（`users.email` = `varchar(255)`）と同じ値にする。
 *
 * API 側で弾かないと超過分は INSERT まで到達し、MySQL がカラム長エラーを返して 500 になる
 * （SQLite は varchar の長さを強制しないため、e2e だけでは気づけない）。
 * 契約（`packages/api-spec/main.tsp` の `@maxLength(255)`）とも同じ値を保つ。
 */
export const MAX_EMAIL_LENGTH = 255;

/**
 * bcrypt が扱えるパスワードの最大バイト数。これを超えた分は**静かに切り捨てられる**。
 * 文字数ではなくバイト数なのが要点で、マルチバイト文字では両者が大きくずれる。
 */
export const BCRYPT_MAX_PASSWORD_BYTES = 72;

/**
 * 文字列の UTF-8 バイト長が上限以内なら true。
 *
 * パスワードの上限を `.max()`（文字数）で見ると bcrypt の制約と一致しない。
 * 例: 「あ」24 文字は 72 バイトちょうどだが、25 文字目を足した 73 バイトの別パスワードでも
 * bcrypt は先頭 72 バイトしか見ないため `compare` が成功してしまう。
 * 「利用者が入力したものと違う値でログインできる」状態を防ぐため、バイト長で判定する。
 */
export function isWithinUtf8Bytes(value: string, maxBytes: number): boolean {
  return Buffer.byteLength(value, 'utf8') <= maxBytes;
}

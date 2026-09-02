import { BCRYPT_MAX_PASSWORD_BYTES, isRfc3339, isHttpUrl, isWithinUtf8Bytes } from './zod-helpers';

describe('zod-helpers', () => {
  describe('isRfc3339', () => {
    it.each([
      ['full-date', '2026-01-01'],
      ['うるう日（400 年規則で閏年）', '2000-02-29'],
      ['うるう日（4 年規則で閏年）', '2024-02-29'],
      ['月末（30 日の月）', '2026-04-30'],
      ['date-time（Z）', '2026-06-10T00:00:00Z'],
      ['date-time（Z・ミリ秒あり）', '2026-06-10T00:00:00.000Z'],
      ['date-time（正のオフセット）', '2026-06-10T09:00:00+09:00'],
      ['date-time（負のオフセット）', '2026-06-10T09:00:00-05:00'],
    ])('正常系: %s は受理する（%s）', (_name, value) => {
      expect(isRfc3339(value)).toBe(true);
    });

    // Date.parse は月の長さを検査せず翌月へ繰り上げるため、以前はこれらが「別の日」として保存されていた
    it.each([
      ['2 月 30 日', '2026-02-30'],
      ['平年の 2 月 29 日', '2026-02-29'],
      ['100 年規則で平年の 2 月 29 日', '1900-02-29'],
      ['31 日が無い月の 31 日', '2026-04-31'],
      ['0 日', '2026-04-00'],
    ])('準正常系: 実在しない日 %s は拒否する（%s）', (_name, value) => {
      expect(isRfc3339(value)).toBe(false);
    });

    // オフセットが無いと new Date() が実行環境のローカル時刻として解釈し、
    // 同じ入力が開発機（Asia/Tokyo）とコンテナ（UTC）で別の instant になる
    it.each([
      ['オフセットなし', '2026-01-01T12:30:00'],
      ['オフセットなし・秒なし', '2026-01-01T12:30'],
      ['区切りが空白', '2026-01-01 12:30:00'],
      ['区切りが空白・オフセットあり', '2026-01-01 12:30:00Z'],
    ])('準正常系: 曖昧な日時 %s は拒否する（%s）', (_name, value) => {
      expect(isRfc3339(value)).toBe(false);
    });

    it.each([
      ['月が範囲外', '2026-13-01'],
      ['日が範囲外', '2026-01-32'],
      ['時が範囲外', '2026-01-01T24:00:00Z'],
      ['分が範囲外', '2026-01-01T00:60:00Z'],
      ['うるう秒', '2026-01-01T23:59:60Z'],
      ['オフセットの時が範囲外', '2026-01-01T00:00:00+24:00'],
      ['秒が無い', '2026-06-10T00:00Z'],
      ['区切り文字が違う', '2026/01/01'],
      ['日付ではない', '昨日'],
      ['空文字', ''],
    ])('異常系: %s は拒否する（%s）', (_name, value) => {
      expect(isRfc3339(value)).toBe(false);
    });

    // 受理した文字列は new Date() で一意な instant に落ちる＝内側の層は解釈揺れを気にしなくてよい
    it('正常系: 受理した full-date は UTC 0 時として解釈される', () => {
      expect(new Date('2026-06-15').toISOString()).toBe('2026-06-15T00:00:00.000Z');
    });
  });

  describe('isHttpUrl', () => {
    it('正常系: http / https を受理する', () => {
      expect(isHttpUrl('http://example.com')).toBe(true);
      expect(isHttpUrl('https://example.com/a?b=1')).toBe(true);
    });

    it('異常系: 危険スキーム・URL でない文字列は拒否する', () => {
      expect(isHttpUrl('javascript:alert(1)')).toBe(false);
      expect(isHttpUrl('data:text/html,<b>x</b>')).toBe(false);
      expect(isHttpUrl('example.com')).toBe(false);
    });
  });

  describe('isWithinUtf8Bytes', () => {
    it('正常系: 上限ちょうどのマルチバイト文字列を受理する（「あ」24 文字 = 72 バイト）', () => {
      const boundary = 'あ'.repeat(24);

      expect(boundary).toHaveLength(24);
      expect(Buffer.byteLength(boundary, 'utf8')).toBe(BCRYPT_MAX_PASSWORD_BYTES);
      expect(isWithinUtf8Bytes(boundary, BCRYPT_MAX_PASSWORD_BYTES)).toBe(true);
    });

    it('異常系: 1 バイト超過を拒否する（文字数では 25 文字でしかない）', () => {
      const over = `${'あ'.repeat(24)}x`;

      expect(over).toHaveLength(25);
      expect(Buffer.byteLength(over, 'utf8')).toBe(BCRYPT_MAX_PASSWORD_BYTES + 1);
      expect(isWithinUtf8Bytes(over, BCRYPT_MAX_PASSWORD_BYTES)).toBe(false);
    });

    it('準正常系: 文字数上限では見逃す長さを拒否する（「あ」25〜72 文字は 75〜216 バイト）', () => {
      // .max(72)（文字数）なら通ってしまう範囲が、バイト判定では弾かれることを示す
      expect('あ'.repeat(72)).toHaveLength(72);
      expect(isWithinUtf8Bytes('あ'.repeat(72), BCRYPT_MAX_PASSWORD_BYTES)).toBe(false);
    });

    it('準正常系: ASCII では文字数と一致する（72 文字 = 72 バイト、73 文字は超過）', () => {
      expect(isWithinUtf8Bytes('a'.repeat(72), BCRYPT_MAX_PASSWORD_BYTES)).toBe(true);
      expect(isWithinUtf8Bytes('a'.repeat(73), BCRYPT_MAX_PASSWORD_BYTES)).toBe(false);
    });

    it('準正常系: 絵文字（サロゲートペア）も文字数ではなくバイト数で数える', () => {
      // 「🙂」は UTF-16 で 2 単位（length=2）だが UTF-8 では 4 バイト
      const emoji = '🙂'.repeat(18); // length=36 / 72 バイト
      expect(isWithinUtf8Bytes(emoji, BCRYPT_MAX_PASSWORD_BYTES)).toBe(true);
      expect(isWithinUtf8Bytes(`${emoji}a`, BCRYPT_MAX_PASSWORD_BYTES)).toBe(false);
    });
  });
});

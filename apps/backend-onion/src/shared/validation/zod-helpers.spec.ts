import { BCRYPT_MAX_PASSWORD_BYTES, isIso8601, isHttpUrl, isWithinUtf8Bytes } from './zod-helpers';

describe('zod-helpers', () => {
  describe('isIso8601', () => {
    it('正常系: 日付のみ・日時（Z / オフセット付き）を受理する', () => {
      expect(isIso8601('2026-01-01')).toBe(true);
      expect(isIso8601('2026-06-10T00:00:00.000Z')).toBe(true);
      expect(isIso8601('2026-06-10T09:00:00+09:00')).toBe(true);
    });

    it('異常系: 形式が違う・日付として成立しない値は拒否する', () => {
      expect(isIso8601('2026/01/01')).toBe(false);
      expect(isIso8601('昨日')).toBe(false);
      expect(isIso8601('2026-13-01')).toBe(false);
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

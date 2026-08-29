import { InvalidDateRangeError } from '../errors/task.errors';
import { DateRange } from './date-range';

const START = new Date('2026-03-01T00:00:00.000Z');
const END = new Date('2026-03-10T00:00:00.000Z');

describe('DateRange（Value Object）', () => {
  describe('生成時に不変条件を守る', () => {
    it('正常系: 開始 < 終了で組み立てられる', () => {
      const range = DateRange.of(START, END);

      expect(range.start).toEqual(START);
      expect(range.end).toEqual(END);
    });

    it('正常系: 終了なし（開始のみ）も有効な期間', () => {
      const range = DateRange.of(START, null);

      expect(range.start).toEqual(START);
      expect(range.end).toBeNull();
    });

    it('準正常系: 開始と終了が同時刻でも有効（開始 ≤ 終了）', () => {
      const range = DateRange.of(START, new Date(START.getTime()));

      expect(range.end).toEqual(START);
    });

    it('異常系: 終了が開始より前なら InvalidDateRangeError（1 ミリ秒でも弾く）', () => {
      const justBefore = new Date(START.getTime() - 1);

      expect(() => DateRange.of(START, justBefore)).toThrow(InvalidDateRangeError);
    });
  });

  describe('不変（共有しても壊れない）', () => {
    it('準正常系: 渡した Date を後から変更しても VO は変わらない（生成時に複製する）', () => {
      const mutable = new Date(START.getTime());
      const range = DateRange.of(mutable, END);

      mutable.setFullYear(1999);

      expect(range.start).toEqual(START);
    });

    it('準正常系: 取り出した Date を変更しても VO は変わらない（getter が複製を返す）', () => {
      const range = DateRange.of(START, END);

      range.start.setFullYear(1999);

      expect(range.start).toEqual(START);
    });

    it('正常系: withEnd は新しいインスタンスを返し、元の期間は変わらない', () => {
      const range = DateRange.of(START, null);

      const extended = range.withEnd(END);

      expect(extended.end).toEqual(END);
      expect(range.end).toBeNull();
      expect(extended).not.toBe(range);
    });

    it('異常系: withStart で不変条件が壊れる場合は例外になり、元の期間も変わらない', () => {
      const range = DateRange.of(START, END);
      const afterEnd = new Date(END.getTime() + 1);

      expect(() => range.withStart(afterEnd)).toThrow(InvalidDateRangeError);
      expect(range.start).toEqual(START);
    });
  });

  describe('等価性は同一性ではなく属性で決まる', () => {
    it('正常系: 別インスタンスでも同じ値なら等価', () => {
      const a = DateRange.of(START, END);
      const b = DateRange.of(new Date(START.getTime()), new Date(END.getTime()));

      expect(a.equals(b)).toBe(true);
      expect(a).not.toBe(b);
    });

    it('準正常系: 終了の有無が違えば等価でない', () => {
      expect(DateRange.of(START, END).equals(DateRange.of(START, null))).toBe(false);
    });

    it('準正常系: 開始が 1 ミリ秒違えば等価でない', () => {
      const shifted = new Date(START.getTime() + 1);

      expect(DateRange.of(START, END).equals(DateRange.of(shifted, END))).toBe(false);
    });
  });
});

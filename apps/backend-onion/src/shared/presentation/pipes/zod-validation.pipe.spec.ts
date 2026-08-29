import { UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';
import type { ValidationError } from '@app/api-client';
import { ZodValidationPipe } from './zod-validation.pipe';

/** 例外ボディを契約 ApiError の検証失敗形として取り出す。 */
function bodyOf(e: unknown): { message: string; errors: ValidationError[] } {
  expect(e).toBeInstanceOf(UnprocessableEntityException);
  return (e as UnprocessableEntityException).getResponse() as {
    message: string;
    errors: ValidationError[];
  };
}

/** 検証が通ってしまった場合にテストを失敗させる（catch 節に入らないことを検出する）。 */
function expectThrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error('例外が投げられていない');
}

/**
 * ZodValidationPipe 単体。
 * 検証成功は値をそのまま返し、失敗は 422(UnprocessableEntityException) へ
 * 人間向けの message とフィールド別の errors を載せて翻訳することを確認する。
 */
describe('ZodValidationPipe', () => {
  const schema = z.object({ name: z.string().min(1), age: z.number().int().optional() }).strict();
  const pipe = new ZodValidationPipe(schema);

  it('正常系: スキーマに適合する値はパース結果をそのまま返す', () => {
    expect(pipe.transform({ name: 'taro', age: 20 })).toEqual({ name: 'taro', age: 20 });
  });

  it('異常系: 必須フィールド欠如は 422 を投げ、message と errors の両方に name を含む', () => {
    const body = bodyOf(expectThrown(() => pipe.transform({})));

    expect(body.message).toContain('name');
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].field).toBe('name');
    expect(body.errors[0].messages).toHaveLength(1);
  });

  it('異常系: 未知キーは .strict で 422 拒否し、errors のフィールドは未知キー名になる', () => {
    const body = bodyOf(expectThrown(() => pipe.transform({ name: 'taro', extra: 'x' })));

    expect(body.errors.map((e) => e.field)).toEqual(['extra']);
  });

  it('異常系: 型不一致（age に文字列）は 422 を投げ、errors に age が入る', () => {
    const body = bodyOf(expectThrown(() => pipe.transform({ name: 'taro', age: 'twenty' })));

    expect(body.errors.map((e) => e.field)).toEqual(['age']);
  });

  it('異常系: 複数フィールドが同時に不正なら errors も複数要素になる', () => {
    const body = bodyOf(expectThrown(() => pipe.transform({ name: '', age: 'twenty' })));

    expect(body.errors.map((e) => e.field)).toEqual(['name', 'age']);
  });

  it('準正常系: ボディ自体が object でない場合はフィールドに紐づかないため "_" に入る', () => {
    const body = bodyOf(expectThrown(() => pipe.transform('not-an-object')));

    expect(body.errors.map((e) => e.field)).toEqual(['_']);
    expect(body.errors[0].messages[0]).not.toBe('');
  });
});

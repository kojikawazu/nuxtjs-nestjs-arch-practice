import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

/**
 * ZodValidationPipe 単体。
 * 検証成功は値をそのまま返し、失敗は 400(BadRequestException) にフィールド名付きで翻訳することを確認する。
 */
describe('ZodValidationPipe', () => {
  const schema = z.object({ name: z.string().min(1), age: z.number().int().optional() }).strict();
  const pipe = new ZodValidationPipe(schema);

  it('正常系: スキーマに適合する値はパース結果をそのまま返す', () => {
    expect(pipe.transform({ name: 'taro', age: 20 })).toEqual({ name: 'taro', age: 20 });
  });

  it('異常系: 必須フィールド欠如は 400 を投げ、メッセージにフィールド名を含む', () => {
    expect(() => pipe.transform({})).toThrow(BadRequestException);

    try {
      pipe.transform({});
      throw new Error('例外が投げられていない');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const body = (e as BadRequestException).getResponse() as { message: string };
      expect(body.message).toContain('name');
    }
  });

  it('異常系: 未知キーは .strict で 400 拒否する', () => {
    expect(() => pipe.transform({ name: 'taro', extra: 'x' })).toThrow(BadRequestException);
  });

  it('異常系: 型不一致（age に文字列）は 400 を投げ、メッセージに age を含む', () => {
    try {
      pipe.transform({ name: 'taro', age: 'twenty' });
      throw new Error('例外が投げられていない');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const body = (e as BadRequestException).getResponse() as { message: string };
      expect(body.message).toContain('age');
    }
  });
});

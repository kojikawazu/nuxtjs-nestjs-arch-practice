import { PayloadTooLargeException, UnprocessableEntityException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { ValidationError } from '@app/api-client';
import { ImageFilePipe } from './image-file.pipe';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * upload 設定だけを返す最小の ConfigService。
 * `as unknown as` で通しているのは、Pipe が使うのが getOrThrow の 2 キーだけで、
 * ConfigService 全体（内部 cache 等）を組み立てても検証の役に立たないため。
 */
function configWith(maxBytes = MAX_BYTES, allowed = ALLOWED): ConfigService {
  return {
    getOrThrow: (key: string) => {
      if (key === 'upload.maxBytes') return maxBytes;
      if (key === 'upload.allowedMimeTypes') return allowed;
      throw new Error(`unexpected config key: ${key}`);
    },
  } as unknown as ConfigService;
}

/** 検証に使うのは mimetype と size だけなので、その 2 つだけ持つ File を作る。 */
function fileOf(mimetype: string, size: number): Express.Multer.File {
  return { mimetype, size } as Express.Multer.File;
}

/** 422 の例外ボディを契約 ApiError の検証失敗形として取り出す。 */
function fieldsOf(e: unknown): string[] {
  expect(e).toBeInstanceOf(UnprocessableEntityException);
  const body = (e as UnprocessableEntityException).getResponse() as { errors: ValidationError[] };
  return body.errors.map((v) => v.field);
}

describe('ImageFilePipe', () => {
  it('正常系: 許可 MIME・上限内のファイルはそのまま返す', () => {
    const pipe = new ImageFilePipe(configWith());
    const file = fileOf('image/png', 1024);

    expect(pipe.transform(file)).toBe(file);
  });

  it('準正常系: ファイルが無ければ 422（errors のフィールドは file）', () => {
    const pipe = new ImageFilePipe(configWith());

    try {
      pipe.transform(undefined);
      throw new Error('例外が投げられていない');
    } catch (e) {
      expect(fieldsOf(e)).toEqual(['file']);
    }
  });

  it('異常系: 許可されていない MIME は 422（errors のフィールドは file）', () => {
    const pipe = new ImageFilePipe(configWith());

    try {
      pipe.transform(fileOf('text/plain', 10));
      throw new Error('例外が投げられていない');
    } catch (e) {
      expect(fieldsOf(e)).toEqual(['file']);
    }
  });

  it('異常系: 上限超過は 413（多層防御。通常は Multer が受信段階で弾く）', () => {
    const pipe = new ImageFilePipe(configWith());

    expect(() => pipe.transform(fileOf('image/png', MAX_BYTES + 1))).toThrow(
      PayloadTooLargeException,
    );
  });

  it('準正常系: 上限は設定から読む（値を変えれば境界も動く＝ハードコードしていない）', () => {
    const pipe = new ImageFilePipe(configWith(100));

    expect(pipe.transform(fileOf('image/png', 100)).size).toBe(100);
    expect(() => pipe.transform(fileOf('image/png', 101))).toThrow(PayloadTooLargeException);
  });

  it('準正常系: 許可 MIME も設定から読む（webp を外せば webp が弾かれる）', () => {
    const pipe = new ImageFilePipe(configWith(MAX_BYTES, ['image/png']));

    expect(pipe.transform(fileOf('image/png', 10)).mimetype).toBe('image/png');
    try {
      pipe.transform(fileOf('image/webp', 10));
      throw new Error('例外が投げられていない');
    } catch (e) {
      expect(fieldsOf(e)).toEqual(['file']);
    }
  });
});

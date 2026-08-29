import {
  Injectable,
  PayloadTooLargeException,
  type PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** 契約 `ApiError.errors` の形で 422 を投げる（フィールドは multipart のフィールド名 `file`）。 */
function unprocessable(message: string): never {
  throw new UnprocessableEntityException({
    message,
    errors: [{ field: 'file', messages: [message] }],
  });
}

/**
 * 添付画像（multipart の `file`）を検証する Pipe。
 *
 * 上限・許可 MIME は設定（`upload.maxBytes` / `upload.allowedMimeTypes` ＝ 環境変数 `MAX_UPLOAD_BYTES`）
 * から取るため、`ParseFilePipeBuilder` のようにデコレータ評価時の定数では書けない。
 * そこで DI 可能な Pipe クラスにして `@UploadedFile(ImageFilePipe)` で使う
 * （Nest が DI コンテナ経由で生成するので ConfigService を注入できる）。
 *
 * サイズ超過は通常 Multer が受信段階で弾いて 413 になる（`MulterModule` の `limits.fileSize`）。
 * ここでの再チェックは多層防御で、limits が外れた場合の最後の砦。
 * 申告 MIME で判定する（マジックナンバー検査はしない）。拡張子の確定は保存側でも担保する。
 */
@Injectable()
export class ImageFilePipe implements PipeTransform<
  Express.Multer.File | undefined,
  Express.Multer.File
> {
  constructor(private readonly config: ConfigService) {}

  transform(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) {
      unprocessable('file is required');
    }

    const allowed = this.config.getOrThrow<string[]>('upload.allowedMimeTypes');
    if (!allowed.includes(file.mimetype)) {
      unprocessable(`Unsupported image type: ${file.mimetype}`);
    }

    const maxBytes = this.config.getOrThrow<number>('upload.maxBytes');
    if (file.size > maxBytes) {
      // 「内容が不正」ではなく「大きすぎて受け取れない」なので 422 ではなく 413。
      // Multer が先に弾いたときと同じステータスに揃える。
      throw new PayloadTooLargeException(`File too large (max ${maxBytes} bytes)`);
    }

    return file;
  }
}

/** DI トークン。 */
export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');

/** 保存対象の画像（Express.Multer.File に依存しないよう必要最小限に絞った形）。 */
export interface ImageFile {
  mimetype: string;
  buffer: Buffer;
}

/**
 * 画像ストレージの Port。
 *
 * application 層をファイルシステムから切り離す。実装は infrastructure（LocalImageStorage）。
 * 許可外 MIME は UnsupportedImageTypeError を投げる契約とする。
 */
export interface ImageStorage {
  /** サーバ生成名で保存し、公開パス（"/uploads/<file>"）を返す。 */
  save(taskId: string, file: ImageFile): Promise<string>;
  /** 公開パスの実体を削除する（null は no-op、無ければ無視）。 */
  remove(publicPath: string | null): Promise<void>;
}

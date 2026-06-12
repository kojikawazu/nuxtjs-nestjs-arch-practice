/**
 * 画像ストレージのポート（application 層が定義する境界インターフェース）。
 *
 * 「ファイルをどこにどう保存するか（ローカル FS / S3 等）」を抽象化する。
 * application は公開パス（"/uploads/<file>"）を受け取るだけで、保存先の実体を知らない。
 * 具体実装は infrastructure/storage が提供する。
 */
export interface UploadedImage {
  mimetype: string;
  buffer: Buffer;
}

export interface ImageStoragePort {
  /**
   * 画像を保存し、公開パス（"/uploads/<file>"）を返す。
   * 許可外 MIME は UnsupportedImageTypeError を投げる。ファイル名はサーバ生成
   * （クライアント由来の名前を使わない＝パストラバーサル防止）。
   */
  save(taskId: string, file: UploadedImage): Promise<string>;

  /** 公開パスに対応する実体を削除する（null や存在しない場合は無視）。 */
  remove(publicPath: string | null): Promise<void>;
}

/** DI トークン。 */
export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');

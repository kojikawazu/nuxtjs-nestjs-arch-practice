import "@typespec/http";
import "@typespec/openapi";

using Http;

/**
 * タスク管理 API の契約定義。
 * ここを単一の真実（source of truth）とし、OpenAPI → FE/BE の型を生成する。
 */
@service(#{ title: "Task Management API" })
@server("http://localhost:3001", "ローカル backend")
/**
 * 既定は Bearer 必須にし、public なエンドポイントだけが `@useAuth(NoAuth)` で opt-out する。
 * 逆（既定 NoAuth + 必要な所だけ opt-in）にすると、付け忘れたエンドポイントが契約上 public に
 * なってしまう＝危険側に倒れるため、既定を「保護」に置く。
 */
@useAuth(BearerAuth)
namespace TaskApi;

// `GET /health` は**意図的にこの契約へ含めない**。死活監視と E2E のサーバ起動待ちのための
// 運用エンドポイントで、製品の API 契約（FE が生成クライアントで叩く面）ではないため。
// 実装は 3 版とも `src/health.controller.ts`（常に 200 / `{ status: "ok" }`）。

// ───────────────────────── 共通エラー ─────────────────────────

/**
 * 1 フィールド分の検証エラー。
 *
 * マップ（`Record<string[]>`）ではなく配列要素にしているのは、TypeSpec の OpenAPI 3.1 出力が
 * 動的キーを `unevaluatedProperties` で表現し、openapi-typescript がそれを解釈できず
 * `Record<string, never>`（キーを持てない型）に落ちるため。配列なら両ツールが素直に扱える。
 */
model ValidationError {
  /** 契約のフィールド名（例: "title" / "endDate" / "file"）。どこにも属さない理由は "_"。 */
  field: string;

  /** そのフィールドが弾かれた理由（複数可）。 */
  messages: string[];
}

@error
model ApiError {
  /** HTTP ステータスコード */
  statusCode: int32;

  /** エラーメッセージ（人間向け） */
  message: string;

  /** エラー種別（例: "Unauthorized"） */
  error?: string;

  /**
   * フィールド別の検証エラー（422 のときのみ付く）。
   * message は全件を連結した人間向けの一文で、errors はそれを UI がフィールドへ割り付けるための構造。
   */
  errors?: ValidationError[];
}

// ───────────────────────── ドメインモデル ─────────────────────────

/** タスクの状態 */
union TaskStatus {
  todo: "todo",
  inProgress: "in_progress",
  done: "done",
}

model Task {
  @key id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  startDate: utcDateTime;
  endDate?: utcDateTime;

  /** 関連 URL（任意）。http/https のみ。確認画面・詳細で安全なリンクとして表示する。 */
  url?: string;

  /** 添付画像の公開パス（例: "/uploads/<file>"）。未添付なら省略。サーバが設定する読み取り専用値。 */
  imageUrl?: string;

  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

model User {
  @key id: string;

  @format("email")
  email: string;

  displayName: string;
  createdAt: utcDateTime;
}

// ───────────────────────── リクエスト/レスポンス ─────────────────────────

model TaskCreate {
  @minLength(1)
  @maxLength(120)
  title: string;

  @maxLength(2000)
  description?: string;

  status?: TaskStatus;
  startDate: utcDateTime;
  endDate?: utcDateTime;

  /**
   * 関連 URL（任意）。**http/https のみ**受け付ける。
   * スキーム制限は JSON Schema で表現できないため契約には現れず、判定はサーバが担う
   * （`javascript:` 等は 422）。`maxLength` だけが契約に載る粗い制約。
   */
  @maxLength(2048)
  url?: string;
}

model TaskUpdate {
  @minLength(1)
  @maxLength(120)
  title?: string;

  @maxLength(2000)
  description?: string;

  status?: TaskStatus;
  startDate?: utcDateTime;
  endDate?: utcDateTime;

  /** 関連 URL（任意）。`TaskCreate.url` と同じく http/https の判定はサーバが担う。 */
  @maxLength(2048)
  url?: string;
}

model RegisterRequest {
  /**
   * メールアドレス。`maxLength` は DB カラム（`users.email` = `varchar(255)`）に合わせた値で、
   * 超過を INSERT 前に弾くためにある（サーバ側で弾かないと MySQL のカラム長エラー = 500 になる）。
   */
  @format("email")
  @maxLength(255)
  email: string;

  /**
   * パスワード。8 文字以上、かつ **UTF-8 で 72 バイト以内**（bcrypt が超過分を切り捨てる境界）。
   * `maxLength` は JSON Schema で表せる文字数の上限にすぎない（マルチバイトでは 72 バイト超が通る）。
   * 実際の判定はサーバの UTF-8 バイト長検証で、超過は 422。
   */
  @minLength(8)
  @maxLength(72)
  password: string;

  @minLength(1)
  @maxLength(80)
  displayName: string;
}

model LoginRequest {
  /** メールアドレス。登録と同じ `maxLength`（DB の `varchar(255)` と整合）を課す。 */
  @format("email")
  @maxLength(255)
  email: string;

  /**
   * パスワード。登録と同じ **UTF-8 72 バイト**の上限を課す（超過は 422）。
   * `maxLength` は登録側と同じく粗い文字数上限にすぎず、実際の判定はサーバのバイト長検証。
   */
  @minLength(1)
  @maxLength(72)
  password: string;
}

model RefreshRequest {
  /** リフレッシュトークン。空文字は受け付けない（サーバは 422）。 */
  @minLength(1)
  refreshToken: string;
}

/** 認証成功時に返すトークンペア */
model AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ───────────────────────── 認証エンドポイント ─────────────────────────

@route("/auth")
@tag("Auth")
namespace Auth {
  /** 新規ユーザー登録（public。まだトークンを持っていない利用者が叩く） */
  @useAuth(NoAuth)
  @route("/register")
  @post
  op register(@body body: RegisterRequest):
    | {
        @statusCode statusCode: 201;
        @body tokens: AuthTokens;
      }
    | ApiError;

  /** ログイン（public。まだトークンを持っていない利用者が叩く） */
  @useAuth(NoAuth)
  @route("/login")
  @post
  op login(@body body: LoginRequest): AuthTokens | ApiError;

  /**
   * アクセストークンの再発行（public）。
   * 資格情報は body のリフレッシュトークンで、Authorization ヘッダは使わない
   * （期限切れのアクセストークンしか持たない状態から呼ぶため）。
   */
  @useAuth(NoAuth)
  @route("/refresh")
  @post
  op refresh(@body body: RefreshRequest): AuthTokens | ApiError;

  /** ログアウト（リフレッシュトークンを失効させる。**要アクセストークン**） */
  @route("/logout")
  @post
  op logout(): {
    @statusCode statusCode: 204;
  } | ApiError;
}

// ───────────────────────── タスクエンドポイント ─────────────────────────

@route("/tasks")
@tag("Tasks")
namespace Tasks {
  /** ログインユーザーのタスク一覧 */
  @get
  op list(): Task[] | ApiError;

  /** タスク新規作成 */
  @post
  op create(@body body: TaskCreate):
    | {
        @statusCode statusCode: 201;
        @body task: Task;
      }
    | ApiError;

  /** タスク詳細 */
  @get
  op get(@path id: string): Task | ApiError;

  /** タスク更新 */
  @route("/{id}")
  @patch(#{ implicitOptionality: false })
  op update(@path id: string, @body body: TaskUpdate): Task | ApiError;

  /** タスク削除 */
  @route("/{id}")
  @delete
  op remove(@path id: string): {
    @statusCode statusCode: 204;
  } | ApiError;

  /**
   * タスクへの画像添付（1枚・任意）。multipart/form-data でフィールド名 `file` を送る。
   * MIME は png/jpeg/webp（不正なら 422）。サイズ上限はサーバ設定（MAX_UPLOAD_BYTES・既定 2MB）で、
   * 超過は受信段階で 413。更新後の Task を返す。
   *
   * 成功時は **200**。新しいリソースを作るのではなく既存タスクを更新して返すため
   * （201 は `POST /tasks` / `POST /auth/register` のような実際の作成に予約する）。
   */
  @route("/{id}/image")
  @post
  op uploadImage(
    @path id: string,
    @header contentType: "multipart/form-data",
    @multipartBody body: {
      file: HttpPart<File>;
    },
  ): Task | ApiError;

  /** タスクの添付画像を削除する。更新後の Task を返す。 */
  @route("/{id}/image")
  @delete
  op removeImage(@path id: string): Task | ApiError;
}

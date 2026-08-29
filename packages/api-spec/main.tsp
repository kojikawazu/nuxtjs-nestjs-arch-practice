import "@typespec/http";
import "@typespec/openapi";

using Http;

/**
 * タスク管理 API の契約定義。
 * ここを単一の真実（source of truth）とし、OpenAPI → FE/BE の型を生成する。
 */
@service(#{ title: "Task Management API" })
@server("http://localhost:3001", "ローカル backend")
@useAuth(BearerAuth)
namespace TaskApi;

// ───────────────────────── 共通エラー ─────────────────────────

@error
model ApiError {
  /** HTTP ステータスコード */
  statusCode: int32;

  /** エラーメッセージ（人間向け） */
  message: string;

  /** エラー種別（例: "Unauthorized"） */
  error?: string;
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

  @maxLength(2048)
  url?: string;
}

model RegisterRequest {
  @format("email")
  email: string;

  @minLength(8)
  @maxLength(72)
  password: string;

  @minLength(1)
  @maxLength(80)
  displayName: string;
}

model LoginRequest {
  @format("email")
  email: string;

  password: string;
}

model RefreshRequest {
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
  /** 新規ユーザー登録 */
  @route("/register")
  @post
  op register(@body body: RegisterRequest):
    | {
        @statusCode statusCode: 201;
        @body tokens: AuthTokens;
      }
    | ApiError;

  /** ログイン */
  @route("/login")
  @post
  op login(@body body: LoginRequest): AuthTokens | ApiError;

  /** アクセストークンの再発行（リフレッシュトークンを使用） */
  @route("/refresh")
  @post
  op refresh(@body body: RefreshRequest): AuthTokens | ApiError;

  /** ログアウト（リフレッシュトークンを失効させる） */
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
   * MIME は png/jpeg/webp、サイズ上限あり（超過・不正 MIME は 400）。更新後の Task を返す。
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

/** 永続化済みユーザーの全状態。infrastructure のマッパーと domain だけが扱う内部表現。 */
export interface UserState {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 新規作成時に確定する属性（id / 日時は永続化時に付与されるため持たない）。 */
export interface NewUser {
  email: string;
  passwordHash: string;
  displayName: string;
}

/**
 * ユーザーのドメインエンティティ（フレームワーク非依存）。
 *
 * TypeORM や HTTP を知らず、永続化は repository（ドメインが所有する契約）に委ねる。
 * パスワードハッシュは内部状態として保持するが、外へ公開するのは `passwordHash`
 * ゲッター経由のみ（照合のため auth が使う。契約への変換では mapper が落とす）。
 */
export class User {
  private constructor(private readonly state: UserState) {}

  /** 永続化済み状態から復元する（infrastructure のマッパーが使用）。 */
  static fromState(state: UserState): User {
    return new User({ ...state });
  }

  get id(): string {
    return this.state.id;
  }

  get email(): string {
    return this.state.email;
  }

  /** パスワード照合のためのハッシュ（auth の login ユースケースが compare に使う）。 */
  get passwordHash(): string {
    return this.state.passwordHash;
  }

  /** 現在の状態のスナップショット（infrastructure の保存・契約変換が使用）。 */
  toState(): UserState {
    return { ...this.state };
  }
}
